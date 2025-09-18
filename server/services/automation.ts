import { storage } from '../storage';
import { sendEmail, renderTemplate } from './email';
import { sendSms, renderSmsTemplate } from './sms';
import { db } from '../db';
import { clients, automations, automationSteps, stages, templates, emailLogs, smsLogs, photographers, estimates, projects } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

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
    if (currentHour >= step.quietHoursStart || currentHour <= step.quietHoursEnd) {
      console.log(`🌙 In quiet hours for ${client.firstName} ${client.lastName}, current hour: ${currentHour}`);
      return; // In quiet hours
    }
  }

  // Check if automation already attempted for this stage entry
  // Since failed attempts have NULL sentAt, we'll use a different approach:
  // Check if ANY log exists for this client + automation step, and compare with stage entry time
  const existingLogs = automation.channel === 'EMAIL' 
    ? await db.select({ status: emailLogs.status, sentAt: emailLogs.sentAt }).from(emailLogs).where(and(
        eq(emailLogs.clientId, client.id),
        eq(emailLogs.automationStepId, step.id)
      ))
    : await db.select({ status: smsLogs.status, sentAt: smsLogs.sentAt }).from(smsLogs).where(and(
        eq(smsLogs.clientId, client.id),
        eq(smsLogs.automationStepId, step.id)
      ));

  // For now, if ANY log exists for this automation step, skip it (one attempt per stage entry)
  if (existingLogs.length > 0) {
    const attempt = existingLogs[0];
    console.log(`🚫 Already attempted for ${client.firstName} ${client.lastName} (${attempt.status}), skipping`);
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
    weddingDate: client.weddingDate ? new Date(client.weddingDate).toLocaleDateString() : 'Not set'
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
      clientId: client.id,
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
      clientId: client.id,
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
