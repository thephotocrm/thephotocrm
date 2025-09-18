import { storage } from '../storage';
import { sendEmail, renderTemplate } from './email';
import { sendSms, renderSmsTemplate } from './sms';
import { db } from '../db';
import { clients, automations, automationSteps, stages, templates, emailLogs, smsLogs, photographers, estimates, projects, bookings } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

// Helper function to get date in photographer's timezone
function getDateInTimezone(date: Date, timezone: string): { year: number, month: number, day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  return {
    year: parseInt(parts.find(p => p.type === 'year')!.value),
    month: parseInt(parts.find(p => p.type === 'month')!.value) - 1, // Month is 0-indexed in Date
    day: parseInt(parts.find(p => p.type === 'day')!.value)
  };
}

interface ClientWithStage {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  weddingDate: Date | null;
  stageEnteredAt: Date | null;
  stageId: string | null;
  emailOptIn: boolean;
  smsOptIn: boolean;
  photographerId: string;
}

export async function processAutomations(photographerId: string): Promise<void> {
  try {
    console.log(`Processing automations for photographer: ${photographerId}`);
    // Get all enabled automations for this photographer
    const allAutomations = await db
      .select()
      .from(automations)
      .where(and(
        eq(automations.photographerId, photographerId),
        eq(automations.enabled, true)
      ));
      
    console.log(`Found ${allAutomations.length} enabled automations`);

    for (const automation of allAutomations) {
      if (automation.automationType === 'COMMUNICATION') {
        await processCommunicationAutomation(automation, photographerId);
      } else if (automation.automationType === 'STAGE_CHANGE') {
        await processStageChangeAutomation(automation, photographerId);
      } else if (automation.automationType === 'COUNTDOWN') {
        await processCountdownAutomation(automation, photographerId);
      }
    }
  } catch (error) {
    console.error('Error processing automations:', error);
  }
}

async function processCommunicationAutomation(automation: any, photographerId: string): Promise<void> {
  // Get automation steps
  const steps = await db
    .select()
    .from(automationSteps)
    .where(and(
      eq(automationSteps.automationId, automation.id),
      eq(automationSteps.enabled, true)
    ))
    .orderBy(automationSteps.stepIndex);

  // Get projects in this stage (changed from clients to projects)
  const projectsInStage = await db
    .select({
      id: projects.id,
      clientId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      smsOptIn: projects.smsOptIn,
      emailOptIn: projects.emailOptIn,
      photographerId: projects.photographerId, // Add missing photographerId
      // Client details
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.stageId, automation.stageId!)
    ));
    
  console.log(`Communication automation "${automation.name}" (${automation.id}) - found ${projectsInStage.length} projects in stage`);

  for (const project of projectsInStage) {
    for (const step of steps) {
      await processAutomationStep(project, step, automation);
    }
  }
}

async function processStageChangeAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing stage change automation: ${automation.name} (trigger: ${automation.triggerType})`);
  
  // Get all active projects for this photographer and project type
  const activeProjects = await db
    .select()
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.projectType, automation.projectType),
      eq(projects.status, 'ACTIVE')
    ));

  console.log(`Found ${activeProjects.length} active projects to check for trigger: ${automation.triggerType}`);

  for (const projectRow of activeProjects) {
    const project = projectRow.projects;
    const shouldTrigger = await checkTriggerCondition(automation.triggerType, project, photographerId);
    
    if (shouldTrigger) {
      console.log(`✅ Trigger "${automation.triggerType}" matched for project ${project.id}, moving to stage ${automation.targetStageId}`);
      await moveProjectToStage(project.id, automation.targetStageId!);
    }
  }
}

async function processAutomationStep(client: any, step: any, automation: any): Promise<void> {
  console.log(`Processing step for client ${client.firstName} ${client.lastName} (${client.email})`);
  
  if (!client.stageEnteredAt) {
    console.log(`❌ No stageEnteredAt date for client ${client.firstName} ${client.lastName}, skipping`);
    return;
  }

  const now = new Date();
  const stageEnteredAt = new Date(client.stageEnteredAt);
  const delayMs = step.delayMinutes * 60 * 1000;
  const shouldSendAt = new Date(stageEnteredAt.getTime() + delayMs);

  // Check if it's time to send
  if (now < shouldSendAt) {
    console.log(`⏰ Too early to send for ${client.firstName} ${client.lastName}. Should send at: ${shouldSendAt}, now: ${now}`);
    return;
  }

  // Check quiet hours
  if (step.quietHoursStart && step.quietHoursEnd) {
    const currentHour = now.getHours();
    const start = step.quietHoursStart;
    const end = step.quietHoursEnd;
    
    // Handle both midnight-crossing and non-midnight-crossing quiet hours
    const inQuietHours = start <= end 
      ? (currentHour >= start && currentHour <= end)  // Non-crossing: 9-17
      : (currentHour >= start || currentHour <= end); // Crossing: 22-6
    
    if (inQuietHours) {
      console.log(`🌙 In quiet hours for ${client.firstName} ${client.lastName}, current hour: ${currentHour}`);
      return; // In quiet hours
    }
  }

  // Check if automation already attempted for this specific stage entry
  // We need to check all logs (including failed attempts) and determine if any were created after stageEnteredAt
  // Since failed attempts have NULL sentAt, we'll use a heuristic: assume logs are created chronologically
  // and compare the most recent log's sentAt (if available) or simply count recent logs as a proxy
  const existingLogs = automation.channel === 'EMAIL' 
    ? await db.select({ 
        id: emailLogs.id, 
        status: emailLogs.status, 
        sentAt: emailLogs.sentAt 
      }).from(emailLogs).where(and(
        eq(emailLogs.projectId, client.id),
        eq(emailLogs.automationStepId, step.id)
      )).orderBy(emailLogs.id) // Order by ID as proxy for creation time
    : await db.select({ 
        id: smsLogs.id, 
        status: smsLogs.status, 
        sentAt: smsLogs.sentAt 
      }).from(smsLogs).where(and(
        eq(smsLogs.projectId, client.id),
        eq(smsLogs.automationStepId, step.id)
      )).orderBy(smsLogs.id); // Order by ID as proxy for creation time

  // Simple approach: if there are any existing logs, check if the most recent successful one
  // was after stageEnteredAt. This allows re-attempts after failures but prevents duplicate successes.
  const recentSuccessfulAttempts = existingLogs.filter(log => 
    log.status === 'sent' && log.sentAt && new Date(log.sentAt) >= stageEnteredAt
  );
  
  if (recentSuccessfulAttempts.length > 0) {
    console.log(`🚫 Already successfully sent for ${client.firstName} ${client.lastName} since stage entry, skipping`);
    return;
  }

  // Check consent
  if (automation.channel === 'EMAIL' && !client.emailOptIn) {
    console.log(`📧 Email opt-in missing for ${client.firstName} ${client.lastName}`);
    return;
  }
  if (automation.channel === 'SMS' && !client.smsOptIn) {
    console.log(`📱 SMS opt-in missing for ${client.firstName} ${client.lastName}`);
    return;
  }

  // Get template
  if (!step.templateId) {
    console.log(`📝 No template ID for ${client.firstName} ${client.lastName}`);
    return;
  }
  
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, step.templateId));

  if (!template) {
    console.log(`📝 Template not found for ${client.firstName} ${client.lastName}, templateId: ${step.templateId}`);
    return;
  }

  // Validate that template channel matches automation channel
  if (template.channel !== automation.channel) {
    console.log(`❌ Template channel mismatch for automation ${automation.name}: template=${template.channel}, automation=${automation.channel}`);
    return;
  }

  // Get photographer info for businessName
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, client.photographerId));
    
  // Prepare variables for template rendering
  const variables = {
    firstName: client.firstName,
    lastName: client.lastName,
    fullName: `${client.firstName} ${client.lastName}`,
    email: client.email || '',
    phone: client.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    eventDate: client.eventDate ? new Date(client.eventDate).toLocaleDateString() : 'Not set',
    weddingDate: client.eventDate ? new Date(client.eventDate).toLocaleDateString() : 'Not set' // Backward compatibility
  };

  // Send message
  if (automation.channel === 'EMAIL' && client.email) {
    const subject = renderTemplate(template.subject || '', variables);
    const htmlBody = renderTemplate(template.htmlBody || '', variables);
    const textBody = renderTemplate(template.textBody || '', variables);

    console.log(`📧 Sending email to ${client.firstName} ${client.lastName} (${client.email})...`);
    
    // Use environment-configured verified sender
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    console.log(`📧 DEBUG: Using verified sender: ${fromEmail}, reply-to: ${replyToEmail}`);
    
    const success = await sendEmail({
      to: client.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody
    });

    console.log(`📧 Email ${success ? 'sent successfully' : 'FAILED'} to ${client.firstName} ${client.lastName}`);

    // Log the attempt
    await db.insert(emailLogs).values({
      projectId: client.id,
      automationStepId: step.id,
      status: success ? 'sent' : 'failed',
      sentAt: success ? now : null
    });

  } else if (automation.channel === 'SMS' && client.phone) {
    const body = renderSmsTemplate(template.textBody || '', variables);

    const result = await sendSms({
      to: client.phone,
      body
    });

    // Log the attempt
    await db.insert(smsLogs).values({
      projectId: client.id,
      automationStepId: step.id,
      status: result.success ? 'sent' : 'failed',
      providerId: result.sid,
      sentAt: result.success ? now : null
    });
  }
}

async function checkTriggerCondition(triggerType: string, project: any, photographerId: string): Promise<boolean> {
  console.log(`Checking trigger condition: ${triggerType} for project ${project.id}`);
  
  switch (triggerType) {
    case 'DEPOSIT_PAID':
      return await checkDepositPaid(project.id);
    case 'FULL_PAYMENT_MADE':
      return await checkFullPaymentMade(project.id);
    case 'PROJECT_BOOKED':
      return await checkProjectBooked(project);
    case 'CONTRACT_SIGNED':
      return await checkContractSigned(project.id);
    case 'ESTIMATE_ACCEPTED':
      return await checkEstimateAccepted(project.id);
    case 'EVENT_DATE_REACHED':
      return await checkEventDateReached(project);
    case 'PROJECT_DELIVERED':
      return await checkProjectDelivered(project);
    case 'CLIENT_ONBOARDED':
      return await checkClientOnboarded(project);
    case 'APPOINTMENT_BOOKED':
      return await checkAppointmentBooked(project);
    default:
      console.log(`Unknown trigger type: ${triggerType}`);
      return false;
  }
}

async function checkDepositPaid(projectId: string): Promise<boolean> {
  // Check if project has estimates with deposit payments
  const paidEstimates = await db
    .select()
    .from(estimates)
    .where(and(
      eq(estimates.projectId, projectId),
      eq(estimates.status, 'SIGNED'),
      eq(estimates.depositPaid, true)
    ));
  return paidEstimates.length > 0;
}

async function checkFullPaymentMade(projectId: string): Promise<boolean> {
  // Check if project has estimates with full payments
  const fullyPaidEstimates = await db
    .select()
    .from(estimates)
    .where(and(
      eq(estimates.projectId, projectId),
      eq(estimates.status, 'SIGNED'),
      eq(estimates.fullPaid, true)
    ));
  return fullyPaidEstimates.length > 0;
}

async function checkProjectBooked(project: any): Promise<boolean> {
  // Check if project has moved beyond initial inquiry stages
  return project.status === 'ACTIVE' && project.stageId !== null;
}

async function checkContractSigned(projectId: string): Promise<boolean> {
  // Check if project has signed estimates
  const signedEstimates = await db
    .select()
    .from(estimates)
    .where(and(
      eq(estimates.projectId, projectId),
      eq(estimates.status, 'SIGNED')
    ));
  return signedEstimates.length > 0;
}

async function checkEstimateAccepted(projectId: string): Promise<boolean> {
  // Same as contract signed for now
  return await checkContractSigned(projectId);
}

async function checkEventDateReached(project: any): Promise<boolean> {
  if (!project.eventDate) return false;
  
  const eventDate = new Date(project.eventDate);
  const now = new Date();
  
  // Trigger if event date is today or in the past
  return eventDate <= now;
}

async function checkProjectDelivered(project: any): Promise<boolean> {
  // This would typically check for file delivery or gallery completion
  // For now, we'll check if project status is COMPLETED
  return project.status === 'COMPLETED';
}

async function checkClientOnboarded(project: any): Promise<boolean> {
  // Check if client has email/phone and has opted in
  return !!(project.email && (project.emailOptIn || project.smsOptIn));
}

async function checkAppointmentBooked(project: any): Promise<boolean> {
  // Check if project has confirmed bookings in the bookings table
  const confirmedBookings = await db
    .select()
    .from(bookings)
    .where(and(
      eq(bookings.projectId, project.id),
      eq(bookings.status, 'CONFIRMED')
    ));
  return confirmedBookings.length > 0;
}

async function processCountdownAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing countdown automation: ${automation.name} (${automation.daysBefore} days before event)`);
  
  // Validate daysBefore is a non-negative integer (allow 0 for same-day triggers)
  if (automation.daysBefore == null || automation.daysBefore < 0 || !Number.isInteger(automation.daysBefore)) {
    console.log(`❌ Invalid daysBefore value for automation ${automation.name}: ${automation.daysBefore}`);
    return;
  }

  // Validate required fields
  if (!automation.channel || !automation.templateId) {
    console.log(`❌ Missing required fields for countdown automation ${automation.name}: channel=${automation.channel}, templateId=${automation.templateId}`);
    return;
  }
  
  // Get all active projects for this photographer with event dates, filtered by project type
  const activeProjects = await db
    .select({
      id: projects.id,
      clientId: projects.clientId,
      eventDate: projects.eventDate,
      smsOptIn: projects.smsOptIn,
      emailOptIn: projects.emailOptIn,
      photographerId: projects.photographerId,
      // Client details
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.projectType, automation.projectType), // Filter by project type
      eq(projects.status, 'ACTIVE')
    ));

  console.log(`Found ${activeProjects.length} active projects to check for countdown automation`);

  // Get photographer info for timezone
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, photographerId));
    
  const timezone = photographer?.timezone || 'UTC';

  // Get current date in photographer's timezone using proper timezone handling
  const now = new Date();
  const todayParts = getDateInTimezone(now, timezone);
  const today = new Date(todayParts.year, todayParts.month, todayParts.day);

  for (const project of activeProjects) {
    if (!project.eventDate) {
      continue; // Skip projects without event dates
    }

    // Convert event date to photographer's timezone using proper timezone handling
    const eventDateParts = getDateInTimezone(new Date(project.eventDate), timezone);
    const eventDateOnly = new Date(eventDateParts.year, eventDateParts.month, eventDateParts.day);
    
    // Calculate target date (X days before event) in photographer's timezone
    const targetDate = new Date(eventDateOnly);
    targetDate.setDate(targetDate.getDate() - automation.daysBefore);
    
    // Check if today is the target date
    if (today.getTime() === targetDate.getTime()) {
      console.log(`🎯 Countdown trigger for project ${project.id}: ${automation.daysBefore} days before ${eventDateOnly.toLocaleDateString()} (timezone: ${timezone})`);
      
      await sendCountdownMessage(project, automation, photographerId);
    }
  }
}

async function sendCountdownMessage(project: any, automation: any, photographerId: string): Promise<void> {
  console.log(`Sending countdown message to ${project.firstName} ${project.lastName}`);
  
  // Check consent
  if (automation.channel === 'EMAIL' && !project.emailOptIn) {
    console.log(`📧 Email opt-in missing for ${project.firstName} ${project.lastName}`);
    return;
  }
  if (automation.channel === 'SMS' && !project.smsOptIn) {
    console.log(`📱 SMS opt-in missing for ${project.firstName} ${project.lastName}`);
    return;
  }

  // Get photographer timezone for date calculations
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, photographerId));
    
  const timezone = photographer?.timezone || 'UTC';
  
  // Calculate today in photographer's timezone
  const now = new Date();
  const todayInTz = new Date(now.toLocaleString("en-CA", { timeZone: timezone }));
  const startOfDay = new Date(todayInTz.getFullYear(), todayInTz.getMonth(), todayInTz.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Check if message already sent for this countdown period using automation ID as reference
  const logTableName = automation.channel === 'EMAIL' ? emailLogs : smsLogs;
  const existingLogs = await db
    .select()
    .from(logTableName)
    .where(and(
      eq(logTableName.projectId, project.id),
      eq(logTableName.automationStepId, automation.id) // Use automation.id as reference
    ));
  
  const todaysSuccessfulLogs = existingLogs.filter(log => 
    log.status === 'sent' && 
    log.sentAt &&
    new Date(log.sentAt) >= startOfDay && 
    new Date(log.sentAt) < endOfDay
  );
  
  if (todaysSuccessfulLogs.length > 0) {
    console.log(`🚫 Already sent countdown message today for ${project.firstName} ${project.lastName}`);
    return;
  }

  // Get template using templateId from automation
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, automation.templateId));

  if (!template) {
    console.log(`📝 Template not found for countdown automation, templateId: ${automation.templateId}`);
    return;
  }

  // Validate that template channel matches automation channel
  if (template.channel !== automation.channel) {
    console.log(`❌ Template channel mismatch for countdown automation ${automation.name}: template=${template.channel}, automation=${automation.channel}`);
    return;
  }

  // Check contact information and consent
  if (automation.channel === 'EMAIL' && (!project.email || !project.emailOptIn)) {
    console.log(`📧 Email not available or opt-in missing for ${project.firstName} ${project.lastName}`);
    return;
  }
  if (automation.channel === 'SMS' && (!project.phone || !project.smsOptIn)) {
    console.log(`📱 Phone not available or SMS opt-in missing for ${project.firstName} ${project.lastName}`);
    return;
  }

  // Calculate days remaining using photographer's timezone
  const eventDateParts = getDateInTimezone(new Date(project.eventDate), timezone);
  const eventDateInTz = new Date(eventDateParts.year, eventDateParts.month, eventDateParts.day);
  const todayParts = getDateInTimezone(new Date(), timezone);
  const todayInTz = new Date(todayParts.year, todayParts.month, todayParts.day);
  const daysRemaining = Math.ceil((eventDateInTz.getTime() - todayInTz.getTime()) / (1000 * 60 * 60 * 24));
    
  // Prepare variables for template rendering
  const variables = {
    firstName: project.firstName,
    lastName: project.lastName,
    fullName: `${project.firstName} ${project.lastName}`,
    email: project.email || '',
    phone: project.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    eventDate: eventDateInTz.toLocaleDateString(),
    weddingDate: eventDateInTz.toLocaleDateString(), // Backward compatibility
    daysRemaining: daysRemaining.toString(),
    daysBefore: automation.daysBefore.toString()
  };

  // Send message
  if (automation.channel === 'EMAIL' && project.email) {
    const subject = renderTemplate(template.subject || '', variables);
    const htmlBody = renderTemplate(template.htmlBody || '', variables);
    const textBody = renderTemplate(template.textBody || '', variables);

    console.log(`📧 Sending countdown email to ${project.firstName} ${project.lastName} (${project.email})...`);
    
    // Use environment-configured verified sender
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    const success = await sendEmail({
      to: project.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody
    });

    console.log(`📧 Countdown email ${success ? 'sent successfully' : 'FAILED'} to ${project.firstName} ${project.lastName}`);

    // Log the attempt - use null for automationStepId since countdown automations don't have steps
    await db.insert(emailLogs).values({
      projectId: project.id,
      automationStepId: null,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : null
    });

  } else if (automation.channel === 'SMS' && project.phone) {
    const body = renderSmsTemplate(template.textBody || '', variables);

    console.log(`📱 Sending countdown SMS to ${project.firstName} ${project.lastName} (${project.phone})...`);

    const result = await sendSms({
      to: project.phone,
      body
    });

    console.log(`📱 Countdown SMS ${result.success ? 'sent successfully' : 'FAILED'} to ${project.firstName} ${project.lastName}`);

    // Log the attempt - use null for automationStepId since countdown automations don't have steps
    await db.insert(smsLogs).values({
      projectId: project.id,
      automationStepId: null,
      status: result.success ? 'sent' : 'failed',
      providerId: result.sid,
      sentAt: result.success ? new Date() : null
    });
  }
}

async function moveProjectToStage(projectId: string, targetStageId: string): Promise<void> {
  try {
    console.log(`Moving project ${projectId} to stage ${targetStageId}`);
    
    await db
      .update(projects)
      .set({
        stageId: targetStageId,
        stageEnteredAt: new Date()
      })
      .where(eq(projects.id, projectId));
      
    console.log(`✅ Successfully moved project ${projectId} to stage ${targetStageId}`);
  } catch (error) {
    console.error(`❌ Failed to move project ${projectId} to stage ${targetStageId}:`, error);
  }
}

export async function processPaymentReminders(photographerId: string): Promise<void> {
  try {
    // Find proposals that are signed but not fully paid
    const overdueEstimates = await db
      .select()
      .from(estimates)
      .where(and(
        eq(estimates.photographerId, photographerId),
        eq(estimates.status, 'SIGNED')
      ));

    // TODO: Check payment status and send reminders if needed
    // This would require tracking last reminder sent date
    
  } catch (error) {
    console.error('Error processing payment reminders:', error);
  }
}
