import { storage } from '../storage';
import { sendEmail, renderTemplate } from './email';
import { sendSms, renderSmsTemplate } from './sms';
import { db } from '../db';
import { clients, automations, automationSteps, stages, templates, emailLogs, smsLogs, automationExecutions, photographers, projectSmartFiles, smartFiles, projects, bookings, projectQuestionnaires, dripCampaigns, dripCampaignEmails, dripCampaignSubscriptions, dripEmailDeliveries, automationBusinessTriggers } from '@shared/schema';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';

async function getParticipantEmailsForBCC(projectId: string): Promise<string[]> {
  try {
    const participants = await storage.getProjectParticipants(projectId);
    return participants
      .filter(p => p.client.emailOptIn && p.client.email)
      .map(p => p.client.email);
  } catch (error) {
    console.error(`Error fetching participants for project ${projectId}:`, error);
    return [];
  }
}

// Bulletproof automation execution tracking with reservation pattern
async function reserveAutomationExecution(
  projectId: string, 
  automationId: string, 
  automationType: string,
  channel: string,
  stepId?: string,
  triggerType?: string,
  eventDate?: Date,
  daysBefore?: number,
  timezone?: string
): Promise<{ canExecute: boolean; executionId: string | null }> {
  try {
    const executionData: any = {
      projectId,
      automationId,
      automationType,
      channel,
      status: 'PENDING'
    };

    // Add specific fields based on automation type
    if (automationType === 'COMMUNICATION' && stepId) {
      executionData.automationStepId = stepId;
    } else if (automationType === 'STAGE_CHANGE' && triggerType) {
      executionData.triggerType = triggerType;
    } else if (automationType === 'COUNTDOWN' && eventDate && daysBefore !== undefined) {
      // Normalize countdown to date-only key using photographer's timezone to prevent timezone/precision issues
      const photographerTimezone = timezone || 'UTC';
      const eventDateKey = normalizeEventDateKey(eventDate, photographerTimezone);
      executionData.eventDate = new Date(eventDateKey + 'T00:00:00.000Z');
      executionData.daysBefore = daysBefore;
    }

    // Try to insert reservation record - this is the atomic reservation
    const result = await db.insert(automationExecutions).values(executionData).returning({ id: automationExecutions.id });
    
    console.log(`🔒 Automation execution reserved: ${automationType} for project ${projectId}`);
    return { canExecute: true, executionId: result[0].id };
  } catch (error) {
    // If it's a unique constraint violation, automation already reserved/executed
    if (error?.code === '23505') {
      console.log(`🚫 Automation execution already reserved/completed (bulletproof prevention): ${automationType} for project ${projectId}`);
      return { canExecute: false, executionId: null };
    } else {
      console.error('Error reserving automation execution:', error);
      // On error, prevent execution to avoid duplicates (fail-safe approach)
      return { canExecute: false, executionId: null };
    }
  }
}

async function updateExecutionStatus(executionId: string, status: 'SUCCESS' | 'FAILED'): Promise<void> {
  try {
    await db
      .update(automationExecutions)
      .set({ status })
      .where(eq(automationExecutions.id, executionId));
    console.log(`✅ Updated execution status to ${status} for execution ${executionId}`);
  } catch (error) {
    console.error('Error updating execution status:', error);
  }
}

// Helper function to normalize event date to YYYY-MM-DD format in photographer's timezone
function normalizeEventDateKey(eventDate: Date, timezone: string = 'UTC'): string {
  const dateInTz = getDateInTimezone(eventDate, timezone);
  return `${dateInTz.year}-${String(dateInTz.month + 1).padStart(2, '0')}-${String(dateInTz.day).padStart(2, '0')}`;
}

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
      } else if (automation.automationType === 'NURTURE') {
        await processNurtureAutomation(automation, photographerId);
      }
    }
  } catch (error) {
    console.error('Error processing automations:', error);
  }
}

async function processCommunicationAutomation(automation: any, photographerId: string): Promise<void> {
  // Get automation steps for communication (email/SMS)
  const steps = await db
    .select()
    .from(automationSteps)
    .where(and(
      eq(automationSteps.automationId, automation.id),
      eq(automationSteps.enabled, true)
    ))
    .orderBy(automationSteps.stepIndex);

  // Get projects in this stage
  const projectsInStage = await db
    .select({
      id: projects.id,
      clientId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
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
      eq(projects.stageId, automation.stageId!)
    ));
    
  console.log(`Communication automation "${automation.name}" (${automation.id}) - found ${projectsInStage.length} projects in stage`);

  for (const project of projectsInStage) {
    // Process communication steps (email/SMS)
    for (const step of steps) {
      await processAutomationStep(project, step, automation);
    }
    
    // Process questionnaire assignment if configured
    if (automation.questionnaireTemplateId) {
      await processQuestionnaireAssignment(project, automation, photographerId);
    }
  }
}

async function processStageChangeAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing stage change automation: ${automation.name}`);
  
  // Load business triggers for this automation from the new table
  const businessTriggers = await db
    .select()
    .from(automationBusinessTriggers)
    .where(and(
      eq(automationBusinessTriggers.automationId, automation.id),
      eq(automationBusinessTriggers.enabled, true)
    ));

  if (businessTriggers.length === 0) {
    console.log(`No enabled business triggers found for automation ${automation.name}, skipping`);
    return;
  }

  console.log(`Found ${businessTriggers.length} enabled business triggers for automation: ${businessTriggers.map(t => t.triggerType).join(', ')}`);
  
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

  console.log(`Found ${activeProjects.length} active projects to check for business triggers`);

  for (const projectRow of activeProjects) {
    const project = projectRow.projects;
    
    // Check each business trigger - if any trigger is satisfied, execute the automation
    for (const businessTrigger of businessTriggers) {
      // First check if trigger condition is met (don't reserve if not triggered)
      const shouldTrigger = await checkTriggerCondition(businessTrigger.triggerType, project, photographerId);
      
      if (!shouldTrigger) {
        // Trigger condition not met, try next trigger
        continue;
      }
      
      // Additional constraint checks for business triggers
      if (businessTrigger.minAmountCents && !await checkMinAmountConstraint(project.id, businessTrigger.minAmountCents)) {
        console.log(`Min amount constraint not met for business trigger ${businessTrigger.triggerType}, skipping`);
        continue;
      }
      
      if (businessTrigger.projectType && project.projectType !== businessTrigger.projectType) {
        console.log(`Project type constraint not met for business trigger ${businessTrigger.triggerType}, skipping`);
        continue;
      }
      
      // 🔒 BULLETPROOF DUPLICATE PREVENTION - Reserve stage change execution atomically (ONLY after trigger confirmed)
      const reservation = await reserveAutomationExecution(
        project.id, // projectId
        automation.id, // automationId
        'STAGE_CHANGE', // automationType
        'SYSTEM', // channel (stage changes are system actions)
        undefined, // stepId (not used for stage change)
        businessTrigger.triggerType // triggerType
      );
      
      if (!reservation.canExecute) {
        console.log(`🔒 Stage change automation already reserved/executed for project ${project.id} (trigger: ${businessTrigger.triggerType}), prevented duplicate`);
        // Try next trigger (maybe a different trigger can still execute)
        continue;
      }
      
      // 🔒 BULLETPROOF ERROR HANDLING - Wrap stage change execution to prevent PENDING reservations on errors
      try {
        // Execute the stage change
        console.log(`✅ Business trigger "${businessTrigger.triggerType}" matched for project ${project.id}, moving to stage ${automation.targetStageId}`);
        await moveProjectToStage(project.id, automation.targetStageId!);
        // 🔒 BULLETPROOF EXECUTION TRACKING - Update stage change reservation status  
        await updateExecutionStatus(reservation.executionId!, 'SUCCESS');
        
        // Break out of trigger loop - automation executed successfully
        break;
      } catch (error) {
        console.error(`❌ Error executing stage change for project ${project.id}:`, error);
        // 🔒 BULLETPROOF ERROR HANDLING - Mark reservation as FAILED on any error to prevent PENDING state
        await updateExecutionStatus(reservation.executionId!, 'FAILED');
        // Continue trying other triggers - don't break on error
      }
    }
  }
}

async function processAutomationStep(client: any, step: any, automation: any): Promise<void> {
  console.log(`Processing step for client ${client.firstName} ${client.lastName} (${client.email})`);
  
  if (!client.stageEnteredAt) {
    console.log(`❌ No stageEnteredAt date for client ${client.firstName} ${client.lastName}, skipping`);
    return;
  }

  // Check effectiveFrom: only run on clients who entered stage AFTER automation was created
  if (automation.effectiveFrom) {
    const stageEnteredAt = new Date(client.stageEnteredAt);
    const effectiveFrom = new Date(automation.effectiveFrom);
    if (stageEnteredAt < effectiveFrom) {
      console.log(`⏸️ Client entered stage before automation was created (entered: ${stageEnteredAt.toISOString()}, effective: ${effectiveFrom.toISOString()}), skipping`);
      return;
    }
  }

  // Check event date condition
  if (automation.eventDateCondition) {
    if (automation.eventDateCondition === 'HAS_EVENT_DATE' && !client.eventDate) {
      console.log(`📅 Client ${client.firstName} ${client.lastName} does not have event date (required by automation), skipping`);
      return;
    }
    if (automation.eventDateCondition === 'NO_EVENT_DATE' && client.eventDate) {
      console.log(`📅 Client ${client.firstName} ${client.lastName} has event date (automation requires no date), skipping`);
      return;
    }
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

  // 🔒 BULLETPROOF PRECONDITION CHECKS - Validate ALL conditions BEFORE reserving execution
  
  // Determine action type from step or fallback to automation channel
  const actionType = step.actionType || automation.channel;
  
  // Check consent FIRST (before any reservation)
  if (actionType === 'EMAIL' && !client.emailOptIn) {
    console.log(`📧 Email opt-in missing for ${client.firstName} ${client.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMS' && !client.smsOptIn) {
    console.log(`📱 SMS opt-in missing for ${client.firstName} ${client.lastName}, skipping (no reservation)`);
    return;
  }
  // Smart File doesn't require explicit opt-in (it's part of the service agreement)

  // Check contact info EARLY (before reservation)
  if (actionType === 'EMAIL' && !client.email) {
    console.log(`📧 No email address for ${client.firstName} ${client.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMS' && !client.phone) {
    console.log(`📱 No phone number for ${client.firstName} ${client.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMART_FILE' && !client.email) {
    console.log(`📄 No email address for Smart File notification for ${client.firstName} ${client.lastName}, skipping (no reservation)`);
    return;
  }

  // Check template/Smart File exists BEFORE reservation
  let template: any = null;
  let smartFileTemplate: any = null;
  
  if (actionType === 'SMART_FILE') {
    if (!step.smartFileTemplateId) {
      console.log(`📄 No Smart File template ID for ${client.firstName} ${client.lastName}, skipping (no reservation)`);
      return;
    }
    
    [smartFileTemplate] = await db
      .select()
      .from(smartFiles)
      .where(and(
        eq(smartFiles.id, step.smartFileTemplateId),
        eq(smartFiles.photographerId, client.photographerId)
      ));

    if (!smartFileTemplate) {
      console.log(`📄 Smart File template not found for ${client.firstName} ${client.lastName}, templateId: ${step.smartFileTemplateId}, skipping (no reservation)`);
      return;
    }
  } else {
    if (!step.templateId) {
      console.log(`📝 No template ID for ${client.firstName} ${client.lastName}, skipping (no reservation)`);
      return;
    }
    
    [template] = await db
      .select()
      .from(templates)
      .where(and(
        eq(templates.id, step.templateId),
        eq(templates.photographerId, client.photographerId)
      ));

    if (!template) {
      console.log(`📝 Template not found for ${client.firstName} ${client.lastName}, templateId: ${step.templateId}, skipping (no reservation)`);
      return;
    }

    // Validate template-channel match BEFORE reservation
    if (template.channel !== actionType) {
      console.log(`❌ Template channel mismatch for automation ${automation.name}: template=${template.channel}, action=${actionType}, skipping (no reservation)`);
      return;
    }
  }

  // 🔒 BULLETPROOF DUPLICATE PREVENTION - Reserve execution atomically (ONLY after ALL preconditions pass)
  const reservation = await reserveAutomationExecution(
    client.id, // projectId
    automation.id, // automationId
    'COMMUNICATION', // automationType
    automation.channel, // channel
    step.id // stepId
  );
  
  if (!reservation.canExecute) {
    console.log(`🔒 Automation already reserved/executed for ${client.firstName} ${client.lastName}, prevented duplicate (bulletproof reservation)`);
    return;
  }

  // Get photographer info for businessName
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, client.photographerId));
  
  // Generate or get short link for booking calendar
  let schedulingLink = '';
  if (photographer?.publicToken) {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://thephotocrm.com';
    const targetUrl = `${baseUrl}/booking/calendar/${photographer.publicToken}`;
    
    // Try to find existing short link for this photographer's booking calendar
    const existingLinks = await storage.getShortLinksByPhotographer(client.photographerId);
    const existingBookingLink = existingLinks.find(link => 
      link.linkType === 'BOOKING' && link.targetUrl === targetUrl
    );
    
    if (existingBookingLink) {
      schedulingLink = `${baseUrl}/s/${existingBookingLink.shortCode}`;
    } else {
      // Generate a new short link
      const generateShortCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let shortCode = generateShortCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await storage.getShortLink(shortCode);
        if (!existing) break;
        shortCode = generateShortCode();
        attempts++;
      }

      if (attempts < 10) {
        const newLink = await storage.createShortLink({
          photographerId: client.photographerId,
          shortCode,
          targetUrl,
          linkType: 'BOOKING'
        });
        schedulingLink = `${baseUrl}/s/${newLink.shortCode}`;
      } else {
        // Fallback to full URL if short link generation fails
        schedulingLink = targetUrl;
      }
    }
  }
    
  // Prepare variables for template rendering
  const variables = {
    firstName: client.firstName,
    lastName: client.lastName,
    fullName: `${client.firstName} ${client.lastName}`,
    email: client.email || '',
    phone: client.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    eventDate: client.eventDate ? new Date(client.eventDate).toLocaleDateString() : 'Not set',
    weddingDate: client.eventDate ? new Date(client.eventDate).toLocaleDateString() : 'Not set', // Backward compatibility
    scheduling_link: schedulingLink
  };

  // 🔒 BULLETPROOF ERROR HANDLING - Wrap all send operations to prevent PENDING reservations on errors
  try {
    // Send message or Smart File
    if (actionType === 'SMART_FILE' && smartFileTemplate && client.email) {
      // Create project Smart File from template
      console.log(`📄 Creating Smart File for ${client.firstName} ${client.lastName} from template "${smartFileTemplate.name}"...`);
      
      // Generate unique token for the Smart File
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      const token = generateToken();
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://thephotocrm.com';
      
      // Create project Smart File
      const projectSmartFile = await storage.createProjectSmartFile({
        projectId: client.id,
        smartFileTemplateId: smartFileTemplate.id,
        token,
        status: 'DRAFT',
        depositPercent: smartFileTemplate.defaultDepositPercent || 50
      });

      const smartFileUrl = `${baseUrl}/smart-file/${token}`;
      
      // Send notification email to client
      const subject = `${smartFileTemplate.name} from ${photographer?.businessName || 'Your Photographer'}`;
      const htmlBody = `
        <h2>Hi ${client.firstName},</h2>
        <p>${photographer?.businessName || 'Your photographer'} has sent you a ${smartFileTemplate.name}.</p>
        <p>Click the link below to view and respond:</p>
        <p><a href="${smartFileUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View ${smartFileTemplate.name}</a></p>
        <p>Or copy and paste this link: ${smartFileUrl}</p>
        <br/>
        <p>Best regards,<br/>${photographer?.businessName || 'Your Photographer'}</p>
      `;
      const textBody = `Hi ${client.firstName},\n\n${photographer?.businessName || 'Your photographer'} has sent you a ${smartFileTemplate.name}.\n\nView it here: ${smartFileUrl}\n\nBest regards,\n${photographer?.businessName || 'Your Photographer'}`;

      console.log(`📧 Sending Smart File notification email to ${client.email}...`);
      
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
      const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
      const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
      
      const success = await sendEmail({
        to: client.email,
        from: `${fromName} <${fromEmail}>`,
        replyTo: `${fromName} <${replyToEmail}>`,
        subject,
        html: htmlBody,
        text: textBody,
        photographerId: client.photographerId,
        clientId: client.clientId,
        projectId: client.id,
        automationStepId: step.id,
        source: 'AUTOMATION' as const
      });

      console.log(`📄 Smart File ${success ? 'sent successfully' : 'FAILED'} to ${client.firstName} ${client.lastName}`);

      // Log the email attempt
      await db.insert(emailLogs).values({
        clientId: client.clientId,
        projectId: client.id,
        automationStepId: step.id,
        status: success ? 'sent' : 'failed',
        sentAt: success ? now : null
      });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

    } else if (actionType === 'EMAIL' && template && client.email) {
    const subject = renderTemplate(template.subject || '', variables);
    const htmlBody = renderTemplate(template.htmlBody || '', variables);
    const textBody = renderTemplate(template.textBody || '', variables);

    console.log(`📧 Sending email to ${client.firstName} ${client.lastName} (${client.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(client.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
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
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined,
      photographerId: client.photographerId,
      clientId: client.clientId,
      projectId: client.id,
      automationStepId: step.id,
      source: 'AUTOMATION' as const
    });

    console.log(`📧 Email ${success ? 'sent successfully' : 'FAILED'} to ${client.firstName} ${client.lastName}`);

    // Log the attempt
    await db.insert(emailLogs).values({
      clientId: client.clientId,
      projectId: client.id,
      automationStepId: step.id,
      status: success ? 'sent' : 'failed',
      sentAt: success ? now : null
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

    } else if (actionType === 'SMS' && template && client.phone) {
    const body = renderSmsTemplate(template.textBody || '', variables);

    const result = await sendSms({
      to: client.phone,
      body
    });

    // Log the attempt
    await db.insert(smsLogs).values({
      clientId: client.clientId,
      projectId: client.id,
      automationStepId: step.id,
      status: result.success ? 'sent' : 'failed',
      providerId: result.sid,
      sentAt: result.success ? now : null,
      direction: 'OUTBOUND',
      messageBody: body
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, result.success ? 'SUCCESS' : 'FAILED');
    }
  } catch (error) {
    console.error(`❌ Error sending communication message to ${client.firstName} ${client.lastName}:`, error);
    // 🔒 BULLETPROOF ERROR HANDLING - Mark reservation as FAILED on any error to prevent PENDING state
    await updateExecutionStatus(reservation.executionId!, 'FAILED');
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
    case 'SMART_FILE_ACCEPTED':
      return await checkSmartFileAccepted(project.id);
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
  // Check if project has Smart Files with deposit payments
  const smartFilesWithDeposit = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      eq(projectSmartFiles.paymentType, 'DEPOSIT')
    ));

  for (const smartFile of smartFilesWithDeposit) {
    if (smartFile.amountPaidCents && smartFile.amountPaidCents > 0) {
      return true;
    }
  }
  return false;
}

async function checkFullPaymentMade(projectId: string): Promise<boolean> {
  // Check if project has fully paid Smart Files
  const paidSmartFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      eq(projectSmartFiles.status, 'PAID')
    ));

  return paidSmartFiles.length > 0;
}

async function checkProjectBooked(project: any): Promise<boolean> {
  // Check if project has moved beyond initial inquiry stages
  return project.status === 'ACTIVE' && project.stageId !== null;
}

async function checkContractSigned(projectId: string): Promise<boolean> {
  // Check if project has signed Smart Files (client or photographer signature)
  const signedSmartFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(
      eq(projectSmartFiles.projectId, projectId)
    );

  return signedSmartFiles.some(sf => sf.clientSignedAt || sf.photographerSignedAt);
}

async function checkSmartFileAccepted(projectId: string): Promise<boolean> {
  // Check if project has accepted Smart Files
  const acceptedSmartFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      eq(projectSmartFiles.status, 'ACCEPTED')
    ));
  return acceptedSmartFiles.length > 0;
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
  // Check if client has email/phone and has opted in (using project-level opt-in flags)
  return !!(project.emailOptIn || project.smsOptIn);
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

async function checkMinAmountConstraint(projectId: string, minAmountCents: number): Promise<boolean> {
  // Check if project has estimates with completed payments that meet the minimum amount
  const estimatesWithPayments = await db
    .select({
      id: estimates.id,
      totalCents: estimates.totalCents
    })
    .from(estimates)
    .where(and(
      eq(estimates.projectId, projectId),
      eq(estimates.status, 'SIGNED')
    ));

  for (const estimate of estimatesWithPayments) {
    const completedPayments = await db
      .select()
      .from(estimatePayments)
      .where(and(
        eq(estimatePayments.estimateId, estimate.id),
        eq(estimatePayments.status, 'completed')
      ));
    
    const totalPaid = completedPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
    if (totalPaid >= minAmountCents) {
      return true;
    }
  }
  return false;
}

async function processCountdownAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing countdown automation: ${automation.name} (${automation.daysBefore} days before ${automation.eventType || 'event'})`);
  
  // Validate daysBefore is a non-negative integer (allow 0 for same-day triggers)
  if (automation.daysBefore == null || automation.daysBefore < 0 || !Number.isInteger(automation.daysBefore)) {
    console.log(`❌ Invalid daysBefore value for automation ${automation.name}: ${automation.daysBefore}`);
    return;
  }

  // Validate required fields for new countdown automation structure
  if (!automation.eventType || !automation.templateId) {
    console.log(`❌ Missing required fields for countdown automation ${automation.name}: eventType=${automation.eventType}, templateId=${automation.templateId}`);
    return;
  }
  
  // Build query for active projects based on eventType and optional stage condition
  let whereConditions = [
    eq(projects.photographerId, photographerId),
    eq(projects.projectType, automation.projectType),
    eq(projects.status, 'ACTIVE')
  ];

  // Add stage condition if specified (for conditional event countdown automations)
  if (automation.stageCondition) {
    whereConditions.push(eq(projects.stageId, automation.stageCondition));
    console.log(`Filtering by stage condition: ${automation.stageCondition}`);
  }

  // Get all active projects for this photographer with event dates
  const activeProjects = await db
    .select({
      id: projects.id,
      clientId: projects.clientId,
      eventDate: projects.eventDate,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
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
    .where(and(...whereConditions));

  console.log(`Found ${activeProjects.length} active projects to check for countdown automation (stage filter: ${automation.stageCondition || 'none'})`);

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
    // Get the relevant event date based on eventType
    let eventDate: Date | null = null;
    switch (automation.eventType) {
      case 'event_date':
      default:
        eventDate = project.eventDate;
        break;
      // Future support for other event types:
      // case 'session_date':
      //   eventDate = project.sessionDate;
      //   break;
      // case 'delivery_date':
      //   eventDate = project.deliveryDate;
      //   break;
    }

    // Check event date condition FIRST (before checking eventDate existence)
    if (automation.eventDateCondition) {
      if (automation.eventDateCondition === 'HAS_EVENT_DATE' && !eventDate) {
        console.log(`📅 Project ${project.id} does not have event date (required by automation), skipping`);
        continue;
      }
      if (automation.eventDateCondition === 'NO_EVENT_DATE' && eventDate) {
        console.log(`📅 Project ${project.id} has event date (automation requires no date), skipping`);
        continue;
      }
    }

    // For countdown automations, we NEED an event date (unless explicitly filtered out by condition above)
    if (!eventDate) {
      console.log(`⏰ No ${automation.eventType || 'event date'} for project ${project.id}, skipping countdown automation`);
      continue;
    }

    // Check effectiveFrom: only run on clients who entered stage AFTER automation was created
    if (automation.effectiveFrom && project.stageEnteredAt) {
      const stageEnteredAt = new Date(project.stageEnteredAt);
      const effectiveFrom = new Date(automation.effectiveFrom);
      if (stageEnteredAt < effectiveFrom) {
        console.log(`⏸️ Project ${project.id} entered stage before automation was created (entered: ${stageEnteredAt.toISOString()}, effective: ${effectiveFrom.toISOString()}), skipping`);
        continue;
      }
    }

    // Convert event date to photographer's timezone using proper timezone handling
    const eventDateParts = getDateInTimezone(new Date(eventDate), timezone);
    const eventDateOnly = new Date(eventDateParts.year, eventDateParts.month, eventDateParts.day);
    
    // Calculate target date (X days before event) in photographer's timezone
    const targetDate = new Date(eventDateOnly);
    targetDate.setDate(targetDate.getDate() - automation.daysBefore);
    
    // Check if today is the target date
    if (today.getTime() === targetDate.getTime()) {
      console.log(`🎯 Countdown trigger for project ${project.id}: ${automation.daysBefore} days before ${eventDateOnly.toLocaleDateString()} (${automation.eventType}, timezone: ${timezone})`);
      
      await sendCountdownMessage(project, automation, photographerId);
    }
  }
}

async function sendCountdownMessage(project: any, automation: any, photographerId: string): Promise<void> {
  console.log(`Sending countdown message to ${project.firstName} ${project.lastName}`);
  
  // 🔒 BULLETPROOF PRECONDITION CHECKS - Validate ALL conditions BEFORE reserving execution
  
  // Check consent FIRST (before any reservation)
  if (automation.channel === 'EMAIL' && !project.emailOptIn) {
    console.log(`📧 Email opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  if (automation.channel === 'SMS' && !project.smsOptIn) {
    console.log(`📱 SMS opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }

  // Check contact info EARLY (before reservation)
  if (automation.channel === 'EMAIL' && !project.email) {
    console.log(`📧 No email address for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  if (automation.channel === 'SMS' && !project.phone) {
    console.log(`📱 No phone number for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }

  // Get photographer timezone for date calculations
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, photographerId));
    
  const timezone = photographer?.timezone || 'UTC';

  // Check template exists BEFORE reservation
  if (!automation.templateId) {
    console.log(`📝 No template ID for countdown automation ${automation.name}, skipping (no reservation)`);
    return;
  }
  
  const [template] = await db
    .select()
    .from(templates)
    .where(and(
      eq(templates.id, automation.templateId),
      eq(templates.photographerId, photographerId)
    ));

  if (!template) {
    console.log(`📝 Template not found for countdown automation, templateId: ${automation.templateId}, skipping (no reservation)`);
    return;
  }

  // Validate template-channel match BEFORE reservation
  if (template.channel !== automation.channel) {
    console.log(`❌ Template channel mismatch for countdown automation ${automation.name}: template=${template.channel}, automation=${automation.channel}, skipping (no reservation)`);
    return;
  }
  
  // Calculate today in photographer's timezone using proper timezone handling
  const now = new Date();
  const todayParts = getDateInTimezone(now, timezone);
  const startOfDay = new Date(todayParts.year, todayParts.month, todayParts.day);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Calculate event date to create unique identifier for this countdown window
  const eventDateParts = getDateInTimezone(new Date(project.eventDate), timezone);
  const eventDateKey = `${eventDateParts.year}-${eventDateParts.month}-${eventDateParts.day}`;
  
  // 🔒 BULLETPROOF DUPLICATE PREVENTION - Reserve countdown execution atomically (ONLY after ALL preconditions pass)
  const eventDateForTracking = new Date(project.eventDate); // FIX: Use project.eventDate directly instead of undefined eventDateInTz
  const reservation = await reserveAutomationExecution(
    project.id, // projectId
    automation.id, // automationId
    'COUNTDOWN', // automationType
    automation.channel, // channel
    undefined, // stepId (not used for countdown)
    undefined, // triggerType (not used for countdown)
    eventDateForTracking, // eventDate
    automation.daysBefore, // daysBefore
    timezone // photographer's timezone for proper normalization
  );
  
  if (!reservation.canExecute) {
    console.log(`🔒 Countdown automation already reserved/executed for ${project.firstName} ${project.lastName} (event: ${eventDateKey}), prevented duplicate (bulletproof reservation)`);
    return;
  }

  // Calculate days remaining using photographer's timezone (reuse existing variables)
  const eventDateInTz = new Date(eventDateParts.year, eventDateParts.month, eventDateParts.day);
  const todayDateInTz = new Date(todayParts.year, todayParts.month, todayParts.day);
  const daysRemaining = Math.ceil((eventDateInTz.getTime() - todayDateInTz.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate or get short link for booking calendar
  let schedulingLink = '';
  if (photographer?.publicToken) {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://thephotocrm.com';
    const targetUrl = `${baseUrl}/booking/calendar/${photographer.publicToken}`;
    
    const existingLinks = await storage.getShortLinksByPhotographer(photographerId);
    const existingBookingLink = existingLinks.find(link => 
      link.linkType === 'BOOKING' && link.targetUrl === targetUrl
    );
    
    if (existingBookingLink) {
      schedulingLink = `${baseUrl}/s/${existingBookingLink.shortCode}`;
    } else {
      const generateShortCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let shortCode = generateShortCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await storage.getShortLink(shortCode);
        if (!existing) break;
        shortCode = generateShortCode();
        attempts++;
      }

      if (attempts < 10) {
        const newLink = await storage.createShortLink({
          photographerId,
          shortCode,
          targetUrl,
          linkType: 'BOOKING'
        });
        schedulingLink = `${baseUrl}/s/${newLink.shortCode}`;
      } else {
        schedulingLink = targetUrl;
      }
    }
  }
    
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
    daysBefore: automation.daysBefore.toString(),
    scheduling_link: schedulingLink
  };

  // 🔒 BULLETPROOF ERROR HANDLING - Wrap send operations to prevent PENDING reservations on errors
  try {
    // Send message
    if (automation.channel === 'EMAIL' && project.email) {
    const subject = renderTemplate(template.subject || '', variables);
    const htmlBody = renderTemplate(template.htmlBody || '', variables);
    const textBody = renderTemplate(template.textBody || '', variables);

    console.log(`📧 Sending countdown email to ${project.firstName} ${project.lastName} (${project.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(project.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
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
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined
    });

    console.log(`📧 Countdown email ${success ? 'sent successfully' : 'FAILED'} to ${project.firstName} ${project.lastName}`);

    // Log the attempt - use null for automationStepId since countdown automations don't have steps
    await db.insert(emailLogs).values({
      clientId: project.clientId,
      projectId: project.id,
      automationStepId: null,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : null
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update countdown reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

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
      clientId: project.clientId,
      projectId: project.id,
      automationStepId: null,
      status: result.success ? 'sent' : 'failed',
      providerId: result.sid,
      sentAt: result.success ? new Date() : null,
      direction: 'OUTBOUND',
      messageBody: body
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update countdown reservation status
      await updateExecutionStatus(reservation.executionId!, result.success ? 'SUCCESS' : 'FAILED');
    }
  } catch (error) {
    console.error(`❌ Error sending countdown message to ${project.firstName} ${project.lastName}:`, error);
    // 🔒 BULLETPROOF ERROR HANDLING - Mark reservation as FAILED on any error to prevent PENDING state
    await updateExecutionStatus(reservation.executionId!, 'FAILED');
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

async function processQuestionnaireAssignment(project: any, automation: any, photographerId: string): Promise<void> {
  console.log(`Processing questionnaire assignment for ${project.firstName} ${project.lastName} (automation: ${automation.name})`);
  
  if (!automation.questionnaireTemplateId) {
    console.log(`❌ No questionnaire template ID for automation ${automation.name}`);
    return;
  }

  if (!project.stageEnteredAt) {
    console.log(`❌ No stageEnteredAt date for project ${project.id}, skipping questionnaire assignment`);
    return;
  }

  // Check if questionnaire has already been assigned for this project and template
  try {
    const existingAssignments = await db
      .select()
      .from(projectQuestionnaires)
      .where(and(
        eq(projectQuestionnaires.projectId, project.id),
        eq(projectQuestionnaires.templateId, automation.questionnaireTemplateId)
      ));

    if (existingAssignments.length > 0) {
      console.log(`🚫 Questionnaire already assigned to ${project.firstName} ${project.lastName} for this template`);
      return;
    }

    // Create questionnaire assignment
    await db.insert(projectQuestionnaires).values({
      projectId: project.id,
      templateId: automation.questionnaireTemplateId,
      status: 'PENDING'
    });

    console.log(`📋 Successfully assigned questionnaire to ${project.firstName} ${project.lastName}`);
  } catch (error) {
    // 🚫 BULLETPROOF ERROR HANDLING - Don't crash automation system on database schema issues
    if (error?.code === '42703') {
      console.log(`⚠️ Database schema issue for questionnaire assignment (${error.message}). Skipping questionnaire assignment for ${project.firstName} ${project.lastName} to prevent automation system crash.`);
    } else {
      console.error(`❌ Failed to assign questionnaire to ${project.firstName} ${project.lastName}:`, error);
    }
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

async function processNurtureAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing nurture automation: ${automation.name}`);
  
  // Find approved drip campaigns for this photographer and project type
  const activeCampaigns = await db
    .select()
    .from(dripCampaigns)
    .where(and(
      eq(dripCampaigns.photographerId, photographerId),
      eq(dripCampaigns.projectType, automation.projectType || 'WEDDING'),
      eq(dripCampaigns.status, 'APPROVED'),
      eq(dripCampaigns.enabled, true)
    ));

  console.log(`Found ${activeCampaigns.length} active drip campaigns for project type ${automation.projectType}`);

  for (const campaign of activeCampaigns) {
    await processNurtureCampaign(campaign, photographerId);
  }
}

async function processNurtureCampaign(campaign: any, photographerId: string): Promise<void> {
  console.log(`Processing nurture campaign: ${campaign.name} (${campaign.id})`);

  // 1. Check for new projects that should be subscribed to this campaign
  await subscribeNewProjectsToCampaign(campaign, photographerId);

  // 2. Process existing subscriptions to send next emails
  await processExistingSubscriptions(campaign, photographerId);
}

async function subscribeNewProjectsToCampaign(campaign: any, photographerId: string): Promise<void> {
  // Find projects in the target stage that aren't already subscribed and have email opt-in
  const eligibleProjects = await db
    .select({
      id: projects.id,
      clientId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      emailOptIn: projects.emailOptIn,
      // Client details
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(dripCampaignSubscriptions, and(
      eq(dripCampaignSubscriptions.projectId, projects.id),
      eq(dripCampaignSubscriptions.campaignId, campaign.id)
    ))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.stageId, campaign.targetStageId),
      eq(projects.status, 'ACTIVE'),
      eq(projects.emailOptIn, true), // Must have email opt-in
      // Not already subscribed
      isNull(dripCampaignSubscriptions.id)
    ));

  console.log(`Found ${eligibleProjects.length} eligible projects for campaign ${campaign.name}`);

  for (const project of eligibleProjects) {
    // Check that client has email address
    if (!project.email) {
      console.log(`Project ${project.id} has no email address, skipping subscription`);
      continue;
    }

    // Subscribe project to campaign
    const now = new Date();
    const firstEmailWeeks = 0; // Start immediately
    const nextEmailAt = new Date(now.getTime() + (firstEmailWeeks * 7 * 24 * 60 * 60 * 1000));

    await db.insert(dripCampaignSubscriptions).values({
      campaignId: campaign.id,
      projectId: project.id,
      clientId: project.clientId,
      startedAt: now,
      nextEmailIndex: 0,
      nextEmailAt: nextEmailAt,
      status: 'ACTIVE'
    });

    console.log(`✅ Subscribed project ${project.id} (${project.firstName} ${project.lastName}) to campaign ${campaign.name}`);
  }
}

async function processExistingSubscriptions(campaign: any, photographerId: string): Promise<void> {
  const now = new Date();
  
  // Find active subscriptions that are ready for their next email
  const readySubscriptions = await db
    .select({
      subscription: dripCampaignSubscriptions,
      project: projects,
      client: clients
    })
    .from(dripCampaignSubscriptions)
    .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(
      eq(dripCampaignSubscriptions.campaignId, campaign.id),
      eq(dripCampaignSubscriptions.status, 'ACTIVE'),
      lte(dripCampaignSubscriptions.nextEmailAt, now), // Ready to send
      eq(projects.status, 'ACTIVE') // Project still active
    ));

  console.log(`Found ${readySubscriptions.length} subscriptions ready for next email in campaign ${campaign.name}`);

  for (const { subscription, project, client } of readySubscriptions) {
    await processSubscriptionEmail(subscription, campaign, project, client, photographerId);
  }
}

async function processSubscriptionEmail(subscription: any, campaign: any, project: any, client: any, photographerId: string): Promise<void> {
  console.log(`Processing subscription email for ${client.firstName} ${client.lastName}, next email index: ${subscription.nextEmailIndex}`);

  // Get the next email in the sequence
  const nextEmail = await db
    .select()
    .from(dripCampaignEmails)
    .where(and(
      eq(dripCampaignEmails.campaignId, campaign.id),
      eq(dripCampaignEmails.sequenceIndex, subscription.nextEmailIndex)
    ))
    .limit(1);

  if (nextEmail.length === 0) {
    console.log(`No more emails in sequence for subscription ${subscription.id}, completing campaign`);
    // Mark subscription as completed
    await db
      .update(dripCampaignSubscriptions)
      .set({ 
        status: 'COMPLETED',
        completedAt: new Date()
      })
      .where(eq(dripCampaignSubscriptions.id, subscription.id));
    return;
  }

  const emailToSend = nextEmail[0];

  // Check if email was already delivered (duplicate prevention)
  const existingDelivery = await db
    .select()
    .from(dripEmailDeliveries)
    .where(and(
      eq(dripEmailDeliveries.subscriptionId, subscription.id),
      eq(dripEmailDeliveries.emailId, emailToSend.id)
    ))
    .limit(1);

  if (existingDelivery.length > 0) {
    console.log(`Email ${emailToSend.sequenceIndex} already delivered for subscription ${subscription.id}, skipping`);
    return;
  }

  // Check if project has event date and if it has passed (stop nurturing after event)
  if (project.eventDate) {
    const eventDate = new Date(project.eventDate);
    const now = new Date();
    if (eventDate <= now) {
      console.log(`Event date has passed for project ${project.id}, completing drip campaign`);
      await db
        .update(dripCampaignSubscriptions)
        .set({ 
          status: 'COMPLETED',
          completedAt: new Date()
        })
        .where(eq(dripCampaignSubscriptions.id, subscription.id));
      return;
    }
  }

  // Check max duration (stop after maxDurationMonths)
  const subscriptionStartDate = new Date(subscription.startedAt);
  const maxDurationMs = campaign.maxDurationMonths * 30 * 24 * 60 * 60 * 1000; // Approximate months to milliseconds
  const now = new Date();
  if (now.getTime() - subscriptionStartDate.getTime() > maxDurationMs) {
    console.log(`Max duration reached for subscription ${subscription.id}, completing campaign`);
    await db
      .update(dripCampaignSubscriptions)
      .set({ 
        status: 'COMPLETED',
        completedAt: new Date()
      })
      .where(eq(dripCampaignSubscriptions.id, subscription.id));
    return;
  }

  // Get photographer info for email personalization
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, photographerId));

  // Generate or get short link for booking calendar
  let schedulingLink = '';
  if (photographer?.publicToken) {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://thephotocrm.com';
    const targetUrl = `${baseUrl}/booking/calendar/${photographer.publicToken}`;
    
    const existingLinks = await storage.getShortLinksByPhotographer(photographerId);
    const existingBookingLink = existingLinks.find(link => 
      link.linkType === 'BOOKING' && link.targetUrl === targetUrl
    );
    
    if (existingBookingLink) {
      schedulingLink = `${baseUrl}/s/${existingBookingLink.shortCode}`;
    } else {
      const generateShortCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let shortCode = generateShortCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await storage.getShortLink(shortCode);
        if (!existing) break;
        shortCode = generateShortCode();
        attempts++;
      }

      if (attempts < 10) {
        const newLink = await storage.createShortLink({
          photographerId,
          shortCode,
          targetUrl,
          linkType: 'BOOKING'
        });
        schedulingLink = `${baseUrl}/s/${newLink.shortCode}`;
      } else {
        schedulingLink = targetUrl;
      }
    }
  }

  // Prepare variables for template rendering
  const variables = {
    firstName: client.firstName,
    lastName: client.lastName,
    fullName: `${client.firstName} ${client.lastName}`,
    email: client.email || '',
    phone: client.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    eventDate: project.eventDate ? new Date(project.eventDate).toLocaleDateString() : 'Not set',
    scheduling_link: schedulingLink
  };

  // Render email content
  const subject = renderTemplate(emailToSend.subject, variables);
  const htmlBody = renderTemplate(emailToSend.htmlBody, variables);
  const textBody = renderTemplate(emailToSend.textBody || '', variables);

  // Create delivery record first
  const deliveryRecord = await db.insert(dripEmailDeliveries).values({
    subscriptionId: subscription.id,
    emailId: emailToSend.id,
    clientId: client.id,
    projectId: project.id,
    status: 'PENDING'
  }).returning({ id: dripEmailDeliveries.id });

  const deliveryId = deliveryRecord[0].id;

  try {
    // Send email
    console.log(`📧 Sending drip email to ${client.firstName} ${client.lastName} (${client.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(project.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    const success = await sendEmail({
      to: client.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined,
      photographerId: client.photographerId,
      clientId: client.clientId,
      projectId: project.id,
      automationStepId: null,
      source: 'DRIP_CAMPAIGN' as const
    });

    if (success) {
      // Update delivery status to sent
      await db
        .update(dripEmailDeliveries)
        .set({ 
          status: 'SENT',
          sentAt: new Date()
        })
        .where(eq(dripEmailDeliveries.id, deliveryId));

      // Update subscription for next email
      const nextEmailIndex = subscription.nextEmailIndex + 1;
      const nextEmailAt = new Date(now.getTime() + (campaign.emailFrequencyWeeks * 7 * 24 * 60 * 60 * 1000));

      await db
        .update(dripCampaignSubscriptions)
        .set({
          nextEmailIndex,
          nextEmailAt
        })
        .where(eq(dripCampaignSubscriptions.id, subscription.id));

      console.log(`✅ Sent drip email ${emailToSend.sequenceIndex} to ${client.firstName} ${client.lastName}. Next email scheduled for ${nextEmailAt}`);
    } else {
      // Mark delivery as failed
      await db
        .update(dripEmailDeliveries)
        .set({ status: 'FAILED' })
        .where(eq(dripEmailDeliveries.id, deliveryId));

      console.log(`❌ Failed to send drip email to ${client.firstName} ${client.lastName}`);
    }
  } catch (error) {
    console.error(`❌ Error sending drip email to ${client.firstName} ${client.lastName}:`, error);
    
    // Mark delivery as failed
    await db
      .update(dripEmailDeliveries)
      .set({ status: 'FAILED' })
      .where(eq(dripEmailDeliveries.id, deliveryId));
  }
}
