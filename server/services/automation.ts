import { storage } from '../storage';
import { sendEmail, renderTemplate } from './email';
import { sendSms, renderSmsTemplate } from './sms';
import { db } from '../db';
import { contacts, automations, automationSteps, stages, templates, emailLogs, smsLogs, automationExecutions, photographers, projectSmartFiles, smartFiles, smartFilePages, projects, bookings, projectQuestionnaires, dripCampaigns, dripCampaignEmails, dripCampaignSubscriptions, dripEmailDeliveries, automationBusinessTriggers, galleries } from '@shared/schema';
import { eq, and, or, gte, lte, isNull, isNotNull } from 'drizzle-orm';

async function getParticipantEmailsForBCC(projectId: string): Promise<string[]> {
  try {
    const participants = await storage.getProjectParticipants(projectId);
    return participants
      .filter(p => p.contact.emailOptIn && p.contact.email)
      .map(p => p.contact.email);
  } catch (error) {
    console.error(`Error fetching participants for project ${projectId}:`, error);
    return [];
  }
}

// Helper to fetch gallery variables for a project
async function getGalleryVariables(projectId: string, photographerId: string, stageEnteredAt: Date | null): Promise<Record<string, string>> {
  try {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://thephotocrm.com';
    
    // Fetch linked gallery for this project
    const [linkedGallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.projectId, projectId))
      .limit(1);
    
    // Fetch photographer for expiration settings
    const [photographer] = await db
      .select()
      .from(photographers)
      .where(eq(photographers.id, photographerId))
      .limit(1);
    
    const galleryExpirationMonths = photographer?.galleryExpirationMonths || 6;
    
    // Calculate expiration date if stageEnteredAt is available
    let expirationDateStr = '';
    if (stageEnteredAt) {
      const expirationDate = new Date(stageEnteredAt);
      expirationDate.setMonth(expirationDate.getMonth() + galleryExpirationMonths);
      expirationDateStr = expirationDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return {
      gallery_link: linkedGallery ? `${baseUrl}/client/galleries/${linkedGallery.id}` : '',
      gallery_expiration: `${galleryExpirationMonths} months`,
      expiration_date: expirationDateStr,
      promo_code: 'ALBUM10'
    };
  } catch (error) {
    console.error(`Error fetching gallery variables for project ${projectId}:`, error);
    return {
      gallery_link: '',
      gallery_expiration: '6 months',
      expiration_date: '',
      promo_code: 'ALBUM10'
    };
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

interface ContactWithStage {
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
      try {
        console.log(`Processing automation: ${automation.name} (type: ${automation.automationType})`);
        if (automation.automationType === 'COMMUNICATION') {
          await processCommunicationAutomation(automation, photographerId);
        } else if (automation.automationType === 'STAGE_CHANGE') {
          await processStageChangeAutomation(automation, photographerId);
        } else if (automation.automationType === 'COUNTDOWN') {
          await processCountdownAutomation(automation, photographerId);
        } else if (automation.automationType === 'NURTURE') {
          await processNurtureAutomation(automation, photographerId);
        }
      } catch (error) {
        console.error(`Error processing automation ${automation.name} (${automation.automationType}):`, error);
      }
    }
  } catch (error) {
    console.error('Error processing automations:', error);
  }
}

async function processCommunicationAutomation(automation: any, photographerId: string): Promise<void> {
  // Check if this is a custom email builder automation
  if (automation.useEmailBuilder && automation.emailBlocks) {
    await processEmailBuilderAutomation(automation, photographerId);
    return;
  }

  // Get automation steps for communication (email/SMS)
  const steps = await db
    .select()
    .from(automationSteps)
    .where(and(
      eq(automationSteps.automationId, automation.id),
      eq(automationSteps.enabled, true)
    ))
    .orderBy(automationSteps.stepIndex);

  // Get projects in this stage with automations enabled
  const projectsInStage = await db
    .select({
      id: projects.id,
      contactId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      smsOptIn: contacts.smsOptIn,
      emailOptIn: contacts.emailOptIn,
      photographerId: projects.photographerId,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.stageId, automation.stageId!),
      eq(projects.enableAutomations, true) // Only process projects with automations enabled
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

async function processEmailBuilderAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`📧 Processing email builder automation: ${automation.name}`);
  
  // Get projects in this stage with automations enabled
  const projectsInStage = await db
    .select({
      id: projects.id,
      contactId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      smsOptIn: contacts.smsOptIn,
      emailOptIn: contacts.emailOptIn,
      photographerId: projects.photographerId,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.stageId, automation.stageId!),
      eq(projects.enableAutomations, true) // Only process projects with automations enabled
    ));
    
  console.log(`Email builder automation "${automation.name}" (${automation.id}) - found ${projectsInStage.length} projects in stage`);

  for (const project of projectsInStage) {
    try {
      console.log(`Processing email builder step for contact ${project.firstName} ${project.lastName} (${project.email})`);
      
      // Check email opt-in
      if (!project.emailOptIn) {
        console.log(`📧 Email opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
        continue;
      }
      
      // Check email address exists
      if (!project.email) {
        console.log(`📧 No email address for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
        continue;
      }
      
      // Check stage entry date
      if (!project.stageEnteredAt) {
        console.log(`❌ No stageEnteredAt date for contact ${project.firstName} ${project.lastName}, skipping`);
        continue;
      }
      
      // Calculate timing (immediate = 0 delay)
      const stageEnteredAt = new Date(project.stageEnteredAt);
      const delayMinutes = 0; // Immediate for now, can be extended later
      const shouldSendAt = new Date(stageEnteredAt.getTime() + (delayMinutes * 60 * 1000));
      const now = new Date();
      
      // Check if it's time to send
      if (now < shouldSendAt) {
        console.log(`⏰ Too early to send for ${project.firstName} ${project.lastName}. Should send at: ${shouldSendAt}, now: ${now}`);
        continue;
      }
      
      // Reserve execution atomically
      // For email builder automations, don't pass stepId (uses automation+channel uniqueness)
      const reservation = await reserveAutomationExecution(
        project.id,
        automation.id,
        'COMMUNICATION',
        'EMAIL'
        // No stepId for email builder automations - uniqueness via automationId+channel constraint
      );
      
      if (!reservation.canExecute) {
        console.log(`🔒 Automation already reserved/executed for ${project.firstName} ${project.lastName}, prevented duplicate (bulletproof reservation)`);
        continue;
      }
      
      // Get photographer info for branding and variables
      const [photographer] = await db
        .select()
        .from(photographers)
        .where(eq(photographers.id, project.photographerId));
      
      if (!photographer) {
        console.log(`❌ Photographer not found for ${project.photographerId}`);
        await updateExecutionStatus(reservation.executionId!, 'FAILED');
        continue;
      }
      
      // Parse email blocks
      let emailBlocks: any[];
      try {
        emailBlocks = typeof automation.emailBlocks === 'string' 
          ? JSON.parse(automation.emailBlocks) 
          : automation.emailBlocks;
      } catch (error) {
        console.error(`❌ Failed to parse emailBlocks for automation ${automation.name}:`, error);
        await updateExecutionStatus(reservation.executionId!, 'FAILED');
        continue;
      }
      
      // Check for Smart File links in buttons and create Smart File if needed
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://thephotocrm.com';
      
      let smartFileToken: string | undefined;
      
      // Check if any button has a SMART_FILE link type
      for (const block of emailBlocks) {
        if (block.type === 'BUTTON' && block.content?.linkType === 'SMART_FILE' && block.content?.linkValue) {
          // Create a project Smart File from the template
          const smartFileTemplateId = block.content.linkValue;
          
          if (!smartFileTemplateId) {
            console.error(`❌ Smart File linkValue is null or undefined in button block`);
            continue;
          }
          
          // Check if Smart File already exists for this project
          const existingProjectSmartFile = await db
            .select()
            .from(projectSmartFiles)
            .where(and(
              eq(projectSmartFiles.projectId, project.id),
              eq(projectSmartFiles.smartFileId, smartFileTemplateId)
            ))
            .limit(1);
          
          if (existingProjectSmartFile.length > 0) {
            smartFileToken = existingProjectSmartFile[0].token;
            console.log(`📄 Using existing Smart File token: ${smartFileToken}`);
          } else {
            // Fetch smart file template to get its name and pages
            const [smartFileTemplate] = await db
              .select()
              .from(smartFiles)
              .where(eq(smartFiles.id, smartFileTemplateId))
              .limit(1);
            
            if (!smartFileTemplate) {
              console.error(`❌ Smart File template not found: ${smartFileTemplateId}`);
              continue;
            }
            
            // Get pages for this smart file
            const pages = await db
              .select()
              .from(smartFilePages)
              .where(eq(smartFilePages.smartFileId, smartFileTemplateId))
              .orderBy(smartFilePages.pageOrder);
            
            // Create new project Smart File with all required fields
            const token = `sf_${Math.random().toString(36).substring(2, 15)}`;
            await storage.createProjectSmartFile({
              projectId: project.id,
              smartFileId: smartFileTemplateId,
              photographerId: project.photographerId,
              clientId: project.contactId,
              smartFileName: smartFileTemplate.name,
              pagesSnapshot: pages,
              token,
              status: 'SENT',
              sentAt: new Date()
            });
            smartFileToken = token;
            console.log(`📄 Created new Smart File with token: ${smartFileToken}`);
          }
          
          break; // Only need one Smart File per automation
        }
      }
      
      // Import utilities
      const { renderTemplate: renderTemplateFn, generateEmailFromBlocks } = await import('@shared/email-branding-shared');
      
      // Auto-migrate legacy automations: add missing HEADER/SIGNATURE blocks based on flags
      const hasHeaderBlock = emailBlocks.some((b: any) => b.type === 'HEADER');
      const hasSignatureBlock = emailBlocks.some((b: any) => b.type === 'SIGNATURE');
      
      // Prepend HEADER block if flag is set but block doesn't exist
      if (!hasHeaderBlock && automation.includeHeader) {
        emailBlocks.unshift({
          id: `header-${Date.now()}`,
          type: 'HEADER',
          style: automation.headerStyle || photographer.emailHeaderStyle || 'professional'
        });
      }
      
      // Append SIGNATURE block if flag is set but block doesn't exist
      if (!hasSignatureBlock && automation.includeSignature !== false) {
        emailBlocks.push({
          id: `signature-${Date.now()}`,
          type: 'SIGNATURE',
          style: automation.signatureStyle || photographer.emailSignatureStyle || 'professional'
        });
      }
      
      // Prepare variables for template rendering
      const formatEventDate = (dateValue: any): string => {
        if (!dateValue) return 'Not set';
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return 'Not set';
          return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch (error) {
          return 'Not set';
        }
      };
      
      // Fetch gallery variables
      const galleryVars = await getGalleryVariables(project.id, project.photographerId, project.stageEnteredAt);
      
      const variables = {
        firstName: project.firstName,
        lastName: project.lastName,
        fullName: `${project.firstName} ${project.lastName}`,
        email: project.email || '',
        phone: project.phone || '',
        businessName: photographer?.businessName || 'Your Photographer',
        photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
        eventDate: formatEventDate(project.eventDate),
        weddingDate: formatEventDate(project.eventDate),
        first_name: project.firstName,
        last_name: project.lastName,
        full_name: `${project.firstName} ${project.lastName}`,
        business_name: photographer?.businessName || 'Your Photographer',
        photographer_name: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
        event_date: formatEventDate(project.eventDate),
        wedding_date: formatEventDate(project.eventDate),
        smart_file_link: smartFileToken ? `${baseUrl}/smart-file/${smartFileToken}` : '',
        testimonials_link: `${baseUrl}/reviews/submit/${photographerId}`,
        ...galleryVars
      };
      
      // Generate email from blocks (handles HEADER/SIGNATURE blocks internally)
      const { htmlBody, textBody } = generateEmailFromBlocks(
        emailBlocks as any,
        variables,
        photographer
      );
      
      // Render subject line
      const subject = automation.emailSubject || 'New Message';
      const renderedSubject = renderTemplateFn(subject, variables);
      
      // Send email with verified sender address
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
      const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
      const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
      
      try {
        const emailResult = await sendEmail({
          to: project.email,
          from: `${fromName} <${fromEmail}>`,
          replyTo: `${fromName} <${replyToEmail}>`,
          subject: renderedSubject,
          html: htmlBody,
          photographerId: photographer.id,
          clientId: project.contactId,
          projectId: project.id,
          source: 'AUTOMATION'
        });
        
        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Email send failed');
        }
        
        console.log(`✅ Email sent successfully to ${project.firstName} ${project.lastName}`);
        await updateExecutionStatus(reservation.executionId!, 'SUCCESS');
      } catch (error) {
        console.error(`❌ Failed to send email to ${project.firstName} ${project.lastName}:`, error);
        await updateExecutionStatus(reservation.executionId!, 'FAILED');
      }
    } catch (error) {
      console.error(`❌ Error processing email builder for ${project.firstName} ${project.lastName}:`, error);
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
  
  // Get all active projects for this photographer and project type with automations enabled
  // Include projects with NULL status (treat as ACTIVE) and explicitly ACTIVE status
  const activeProjects = await db
    .select({
      projects: projects,
      contacts: contacts
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.projectType, automation.projectType),
      eq(projects.enableAutomations, true), // Only process projects with automations enabled
      or(
        eq(projects.status, 'ACTIVE'),
        isNull(projects.status) // Include NULL status as ACTIVE
      )
    ));

  console.log(`Found ${activeProjects.length} active projects to check for business triggers`);

  for (const projectRow of activeProjects) {
    const project = projectRow.projects;
    
    // If automation has a source stage filter, only process projects in that stage
    if (automation.stageId && project.stageId !== automation.stageId) {
      // Project not in the required source stage, skip
      continue;
    }
    
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

async function processAutomationStep(contact: any, step: any, automation: any): Promise<void> {
  console.log(`Processing step for contact ${contact.firstName} ${contact.lastName} (${contact.email})`);
  
  if (!contact.stageEnteredAt) {
    console.log(`❌ No stageEnteredAt date for contact ${contact.firstName} ${contact.lastName}, skipping`);
    return;
  }

  // Check effectiveFrom: only run on contacts who entered stage AFTER automation was created
  if (automation.effectiveFrom) {
    const stageEnteredAt = new Date(contact.stageEnteredAt);
    const effectiveFrom = new Date(automation.effectiveFrom);
    if (stageEnteredAt < effectiveFrom) {
      console.log(`⏸️ Contact entered stage before automation was created (entered: ${stageEnteredAt.toISOString()}, effective: ${effectiveFrom.toISOString()}), skipping`);
      return;
    }
  }

  // Check event date condition
  if (automation.eventDateCondition) {
    if (automation.eventDateCondition === 'HAS_EVENT_DATE' && !contact.eventDate) {
      console.log(`📅 Contact ${contact.firstName} ${contact.lastName} does not have event date (required by automation), skipping`);
      return;
    }
    if (automation.eventDateCondition === 'NO_EVENT_DATE' && contact.eventDate) {
      console.log(`📅 Contact ${contact.firstName} ${contact.lastName} has event date (automation requires no date), skipping`);
      return;
    }
  }

  const now = new Date();
  const stageEnteredAt = new Date(contact.stageEnteredAt);
  
  // Calculate the target send date/time
  let shouldSendAt: Date;
  
  if (step.scheduledHour !== null && step.scheduledHour !== undefined) {
    // If scheduled time is specified, calculate days from delay and set exact time
    const delayDays = Math.floor(step.delayMinutes / (24 * 60));
    const delayHours = Math.floor((step.delayMinutes % (24 * 60)) / 60);
    const delayMins = step.delayMinutes % 60;
    
    // Start with stage entered date
    shouldSendAt = new Date(stageEnteredAt);
    
    // Add the delay days
    shouldSendAt.setDate(shouldSendAt.getDate() + delayDays);
    
    // Set to the scheduled time on that day
    shouldSendAt.setHours(step.scheduledHour, step.scheduledMinute || 0, 0, 0);
    
    // If there's also hour/minute delay (in addition to days), add it
    if (delayHours > 0 || delayMins > 0) {
      shouldSendAt.setHours(shouldSendAt.getHours() + delayHours);
      shouldSendAt.setMinutes(shouldSendAt.getMinutes() + delayMins);
    }
    
    // CRITICAL: For same-day scenarios (0 delay days), if scheduled time has passed, bump to next day
    // Example: entered 9pm, delay 0 days, scheduled 6pm → should send next day at 6pm (next occurrence)
    // Multi-day delays (e.g., "2 days at 6pm") should NOT bump - they're meant for that specific target day
    if (delayDays === 0 && shouldSendAt.getTime() < stageEnteredAt.getTime()) {
      shouldSendAt.setDate(shouldSendAt.getDate() + 1);
    }
  } else {
    // No scheduled time, just use the delay
    const delayMs = step.delayMinutes * 60 * 1000;
    shouldSendAt = new Date(stageEnteredAt.getTime() + delayMs);
  }

  // Check if it's time to send
  if (now < shouldSendAt) {
    console.log(`⏰ Too early to send for ${contact.firstName} ${contact.lastName}. Should send at: ${shouldSendAt}, now: ${now}`);
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
      console.log(`🌙 In quiet hours for ${contact.firstName} ${contact.lastName}, current hour: ${currentHour}`);
      return; // In quiet hours
    }
  }

  // 🔒 BULLETPROOF PRECONDITION CHECKS - Validate ALL conditions BEFORE reserving execution
  
  // Determine action type from step or fallback to automation channel
  const actionType = step.actionType || automation.channel;
  
  // Check consent FIRST (before any reservation)
  if (actionType === 'EMAIL' && !contact.emailOptIn) {
    console.log(`📧 Email opt-in missing for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMS' && !contact.smsOptIn) {
    console.log(`📱 SMS opt-in missing for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
    return;
  }
  // Smart File doesn't require explicit opt-in (it's part of the service agreement)

  // Check contact info EARLY (before reservation)
  if (actionType === 'EMAIL' && !contact.email) {
    console.log(`📧 No email address for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMS' && !contact.phone) {
    console.log(`📱 No phone number for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMART_FILE' && !contact.email) {
    console.log(`📄 No email address for Smart File notification for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
    return;
  }

  // Check template/Smart File exists BEFORE reservation
  let template: any = null;
  let smartFileTemplate: any = null;
  
  if (actionType === 'SMART_FILE') {
    if (!step.smartFileTemplateId) {
      console.log(`📄 No Smart File template ID for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
      return;
    }
    
    [smartFileTemplate] = await db
      .select()
      .from(smartFiles)
      .where(and(
        eq(smartFiles.id, step.smartFileTemplateId),
        eq(smartFiles.photographerId, contact.photographerId)
      ));

    if (!smartFileTemplate) {
      console.log(`📄 Smart File template not found for ${contact.firstName} ${contact.lastName}, templateId: ${step.smartFileTemplateId}, skipping (no reservation)`);
      return;
    }
  } else {
    // For SMS, allow either template OR custom content
    if (actionType === 'SMS') {
      if (!step.templateId && !step.customSmsContent) {
        console.log(`📝 No template ID or custom SMS content for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
        return;
      }
      
      // Only fetch template if templateId is provided
      if (step.templateId) {
        [template] = await db
          .select()
          .from(templates)
          .where(and(
            eq(templates.id, step.templateId),
            eq(templates.photographerId, contact.photographerId)
          ));

        if (!template) {
          console.log(`📝 Template not found for ${contact.firstName} ${contact.lastName}, templateId: ${step.templateId}, skipping (no reservation)`);
          return;
        }

        // Validate template-channel match BEFORE reservation
        if (template.channel !== actionType) {
          console.log(`❌ Template channel mismatch for automation ${automation.name}: template=${template.channel}, action=${actionType}, skipping (no reservation)`);
          return;
        }
      }
    } else {
      // For EMAIL and other types, template is required
      if (!step.templateId) {
        console.log(`📝 No template ID for ${contact.firstName} ${contact.lastName}, skipping (no reservation)`);
        return;
      }
      
      [template] = await db
        .select()
        .from(templates)
        .where(and(
          eq(templates.id, step.templateId),
          eq(templates.photographerId, contact.photographerId)
        ));

      if (!template) {
        console.log(`📝 Template not found for ${contact.firstName} ${contact.lastName}, templateId: ${step.templateId}, skipping (no reservation)`);
        return;
      }

      // Validate template-channel match BEFORE reservation
      if (template.channel !== actionType) {
        console.log(`❌ Template channel mismatch for automation ${automation.name}: template=${template.channel}, action=${actionType}, skipping (no reservation)`);
        return;
      }
    }
  }

  // 🔒 BULLETPROOF DUPLICATE PREVENTION - Reserve execution atomically (ONLY after ALL preconditions pass)
  const reservation = await reserveAutomationExecution(
    contact.id, // projectId
    automation.id, // automationId
    'COMMUNICATION', // automationType
    automation.channel, // channel
    step.id // stepId
  );
  
  if (!reservation.canExecute) {
    console.log(`🔒 Automation already reserved/executed for ${contact.firstName} ${contact.lastName}, prevented duplicate (bulletproof reservation)`);
    return;
  }

  // Get photographer info for businessName
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, contact.photographerId));
  
  // Generate or get short link for booking calendar
  let schedulingLink = '';
  if (photographer?.publicToken) {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://thephotocrm.com';
    const targetUrl = `${baseUrl}/booking/calendar/${photographer.publicToken}`;
    
    // Try to find existing short link for this photographer's booking calendar
    const existingLinks = await storage.getShortLinksByPhotographer(contact.photographerId);
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
          photographerId: contact.photographerId,
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
    
  // Format event date properly - handle PostgreSQL date strings
  const formatEventDate = (dateValue: any): string => {
    if (!dateValue) return 'Not set';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Not set';
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting event date:', error);
      return 'Not set';
    }
  };

  // Get photographer's public galleries for demo links
  const publicGalleries = await storage.getPublicGalleries(contact.photographerId);
  const demoGallery = publicGalleries.find(g => g.id); // Get first available public gallery
  const demoGalleryLink = demoGallery 
    ? `${baseUrl}/client/gallery/${demoGallery.publicToken}`
    : `${baseUrl}/galleries`;

  // Fetch gallery variables
  const galleryVars = await getGalleryVariables(contact.id, contact.photographerId, contact.stageEnteredAt);
  
  // Prepare variables for template rendering
  const variables = {
    // CamelCase versions
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: `${contact.firstName} ${contact.lastName}`,
    email: contact.email || '',
    phone: contact.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    eventDate: formatEventDate(contact.eventDate),
    weddingDate: formatEventDate(contact.eventDate),
    // Snake_case versions for template compatibility
    first_name: contact.firstName,
    last_name: contact.lastName,
    full_name: `${contact.firstName} ${contact.lastName}`,
    business_name: photographer?.businessName || 'Your Photographer',
    photographer_name: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    event_date: formatEventDate(contact.eventDate),
    wedding_date: formatEventDate(contact.eventDate),
    scheduling_link: schedulingLink,
    scheduler_link: schedulingLink, // Alternative spelling
    gallery_link: demoGalleryLink,
    demo_gallery_link: demoGalleryLink,
    testimonials_link: `${baseUrl}/reviews/submit/${contact.photographerId}`,
    ...galleryVars,
    // Uppercase versions for AI-generated placeholders
    SCHEDULING_LINK: schedulingLink,
    PHOTOGRAPHER_NAME: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    BUSINESS_NAME: photographer?.businessName || 'Your Photographer'
  };

  // 🔒 BULLETPROOF ERROR HANDLING - Wrap all send operations to prevent PENDING reservations on errors
  try {
    // Send message or Smart File
    if (actionType === 'SMART_FILE' && smartFileTemplate && contact.email) {
      // Create project Smart File from template
      console.log(`📄 Creating Smart File for ${contact.firstName} ${contact.lastName} from template "${smartFileTemplate.name}"...`);
      
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
      
      // Fetch template pages for snapshot
      const templatePages = await db
        .select()
        .from(smartFilePages)
        .where(eq(smartFilePages.smartFileId, smartFileTemplate.id))
        .orderBy(smartFilePages.pageOrder);
      
      // Create project Smart File with all required fields
      const projectSmartFile = await storage.createProjectSmartFile({
        projectId: contact.id,
        smartFileId: smartFileTemplate.id,
        photographerId: contact.photographerId,
        contactId: contact.contactId,
        smartFileName: smartFileTemplate.name,
        pagesSnapshot: templatePages,
        token,
        status: 'DRAFT',
        depositPercent: smartFileTemplate.defaultDepositPercent || 50
      });

      const smartFileUrl = `${baseUrl}/smart-file/${token}`;
      
      // Send notification email to contact
      const subject = `${smartFileTemplate.name} from ${photographer?.businessName || 'Your Photographer'}`;
      const htmlBody = `
        <h2>Hi ${contact.firstName},</h2>
        <p>${photographer?.businessName || 'Your photographer'} has sent you a ${smartFileTemplate.name}.</p>
        <p>Click the link below to view and respond:</p>
        <p><a href="${smartFileUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View ${smartFileTemplate.name}</a></p>
        <p>Or copy and paste this link: ${smartFileUrl}</p>
        <br/>
        <p>Best regards,<br/>${photographer?.businessName || 'Your Photographer'}</p>
      `;
      const textBody = `Hi ${contact.firstName},\n\n${photographer?.businessName || 'Your photographer'} has sent you a ${smartFileTemplate.name}.\n\nView it here: ${smartFileUrl}\n\nBest regards,\n${photographer?.businessName || 'Your Photographer'}`;

      console.log(`📧 Sending Smart File notification email to ${contact.email}...`);
      
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
      const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
      const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
      
      const success = await sendEmail({
        to: contact.email,
        from: `${fromName} <${fromEmail}>`,
        replyTo: `${fromName} <${replyToEmail}>`,
        subject,
        html: htmlBody,
        text: textBody,
        photographerId: contact.photographerId,
        contactId: contact.contactId,
        projectId: contact.id,
        automationStepId: step.id,
        source: 'AUTOMATION' as const
      });

      console.log(`📄 Smart File ${success ? 'sent successfully' : 'FAILED'} to ${contact.firstName} ${contact.lastName}`);

      // Log the email attempt
      await db.insert(emailLogs).values({
        clientId: contact.contactId,
        projectId: contact.id,
        automationStepId: step.id,
        status: success ? 'sent' : 'failed',
        sentAt: success ? now : null
      });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

    } else if (actionType === 'EMAIL' && template && contact.email) {
    // Check if automation includes a Smart File template
    let smartFileLink = '';
    if (automation.smartFileTemplateId) {
      console.log(`📄 Automation includes Smart File template: ${automation.smartFileTemplateId}`);
      
      // Fetch the Smart File template
      const [sfTemplate] = await db
        .select()
        .from(smartFiles)
        .where(and(
          eq(smartFiles.id, automation.smartFileTemplateId),
          eq(smartFiles.photographerId, contact.photographerId)
        ));
      
      if (sfTemplate) {
        console.log(`📄 Creating Smart File "${sfTemplate.name}" for email automation...`);
        
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
        
        // Fetch template pages for snapshot
        const templatePages = await db
          .select()
          .from(smartFilePages)
          .where(eq(smartFilePages.smartFileId, sfTemplate.id))
          .orderBy(smartFilePages.pageOrder);
        
        // Create project Smart File
        const projectSmartFile = await storage.createProjectSmartFile({
          projectId: contact.id,
          smartFileId: sfTemplate.id,
          photographerId: contact.photographerId,
          contactId: contact.contactId,
          smartFileName: sfTemplate.name,
          pagesSnapshot: templatePages,
          token,
          status: 'DRAFT',
          depositPercent: sfTemplate.defaultDepositPercent || 50
        });

        smartFileLink = `${baseUrl}/smart-file/${token}`;
        console.log(`📄 Smart File created with link: ${smartFileLink}`);
      } else {
        console.log(`⚠️ Smart File template not found: ${automation.smartFileTemplateId}`);
      }
    }
    
    // Add Smart File link to variables if available
    const emailVariables = {
      ...variables,
      smart_file_link: smartFileLink,
      smartFileLink: smartFileLink,
      SMART_FILE_LINK: smartFileLink
    };
    
    const subject = renderTemplate(template.subject || '', emailVariables);
    const htmlBody = renderTemplate(template.htmlBody || '', emailVariables);
    const textBody = renderTemplate(template.textBody || '', emailVariables);

    console.log(`📧 Sending email to ${contact.firstName} ${contact.lastName} (${contact.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(contact.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
    // Use environment-configured verified sender
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    console.log(`📧 DEBUG: Using verified sender: ${fromEmail}, reply-to: ${replyToEmail}`);
    
    const success = await sendEmail({
      to: contact.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined,
      photographerId: contact.photographerId,
      contactId: contact.contactId,
      projectId: contact.id,
      automationStepId: step.id,
      source: 'AUTOMATION' as const
    });

    console.log(`📧 Email ${success ? 'sent successfully' : 'FAILED'} to ${contact.firstName} ${contact.lastName}`);

    // Log the attempt
    await db.insert(emailLogs).values({
      clientId: contact.contactId,
      projectId: contact.id,
      automationStepId: step.id,
      status: success ? 'sent' : 'failed',
      sentAt: success ? now : null
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

    } else if (actionType === 'SMS' && contact.phone && (template || step.customSmsContent)) {
    // Use custom SMS content if available, otherwise use template
    const smsContent = step.customSmsContent || template?.textBody || '';
    const body = renderSmsTemplate(smsContent, variables);

    console.log(`📱 Sending SMS to ${contact.firstName} ${contact.lastName}: ${step.customSmsContent ? 'custom message' : 'template'}`);

    const result = await sendSms({
      to: contact.phone,
      body
    });

    // Log the attempt
    await db.insert(smsLogs).values({
      clientId: contact.contactId,
      projectId: contact.id,
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
    console.error(`❌ Error sending communication message to ${contact.firstName} ${contact.lastName}:`, error);
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
    case 'GALLERY_SHARED':
      return await checkGalleryShared(project.id);
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

async function checkGalleryShared(projectId: string): Promise<boolean> {
  // Check if project has a gallery that has been shared (sharedAt is not null, status is either ACTIVE or SHARED)
  const sharedGalleries = await db
    .select()
    .from(galleries)
    .where(and(
      eq(galleries.projectId, projectId),
      isNotNull(galleries.sharedAt)
    ));
  return sharedGalleries.length > 0;
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
    eq(projects.status, 'ACTIVE'),
    eq(projects.enableAutomations, true) // Only process projects with automations enabled
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
      contactId: projects.clientId,
      eventDate: projects.eventDate,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
      smsOptIn: contacts.smsOptIn,
      emailOptIn: contacts.emailOptIn,
      photographerId: projects.photographerId,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
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

    // Check effectiveFrom: only run on contacts who entered stage AFTER automation was created
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

  // Check if automation has email content (either template or email blocks) BEFORE reservation
  const hasEmailBlocks = automation.useEmailBuilder && automation.emailBlocks && automation.emailSubject;
  const hasTemplate = automation.templateId;
  
  if (!hasEmailBlocks && !hasTemplate) {
    console.log(`📝 No email content (template or email blocks) for countdown automation ${automation.name}, skipping (no reservation)`);
    return;
  }
  
  // Get template if using templateId
  let template = null;
  if (hasTemplate) {
    const [templateRecord] = await db
      .select()
      .from(templates)
      .where(and(
        eq(templates.id, automation.templateId),
        eq(templates.photographerId, photographerId)
      ));

    if (!templateRecord) {
      console.log(`📝 Template not found for countdown automation, templateId: ${automation.templateId}, skipping (no reservation)`);
      return;
    }

    // Validate template-channel match BEFORE reservation
    if (templateRecord.channel !== automation.channel) {
      console.log(`❌ Template channel mismatch for countdown automation ${automation.name}: template=${templateRecord.channel}, automation=${automation.channel}, skipping (no reservation)`);
      return;
    }
    
    template = templateRecord;
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
    
  // Format event date nicely for countdown automations
  const formattedEventDate = eventDateInTz.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Fetch gallery variables
  const galleryVars = await getGalleryVariables(project.id, photographerId, project.stageEnteredAt);
  
  // Prepare variables for template rendering
  const variables = {
    firstName: project.firstName,
    lastName: project.lastName,
    fullName: `${project.firstName} ${project.lastName}`,
    email: project.email || '',
    phone: project.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    eventDate: formattedEventDate,
    weddingDate: formattedEventDate, // Backward compatibility
    daysRemaining: daysRemaining.toString(),
    daysBefore: automation.daysBefore.toString(),
    scheduling_link: schedulingLink,
    testimonials_link: `${baseUrl}/reviews/submit/${photographerId}`,
    ...galleryVars,
    // Uppercase versions for AI-generated placeholders
    SCHEDULING_LINK: schedulingLink,
    PHOTOGRAPHER_NAME: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    BUSINESS_NAME: photographer?.businessName || 'Your Photographer'
  };

  // 🔒 BULLETPROOF ERROR HANDLING - Wrap send operations to prevent PENDING reservations on errors
  try {
    // Send message
    if (automation.channel === 'EMAIL' && project.email) {
    // Render email content based on whether using email blocks or template
    let subject: string;
    let htmlBody: string;
    let textBody: string;
    
    if (hasEmailBlocks) {
      // Import email block rendering functions
      const { contentBlocksToHtml, renderTemplate: renderTemplateFn } = await import('@shared/template-utils');
      const { wrapEmailContent } = await import('./email-branding');
      
      // Render subject with variables
      subject = renderTemplateFn(automation.emailSubject || '', variables);
      
      // Prepare photographer branding data for HEADER and SIGNATURE blocks
      const photographerBrandingData = {
        businessName: photographer?.businessName || undefined,
        photographerName: photographer?.photographerName || undefined,
        logoUrl: photographer?.logoUrl || undefined,
        headshotUrl: photographer?.headshotUrl || undefined,
        brandPrimary: photographer?.brandPrimary || undefined,
        brandSecondary: photographer?.brandSecondary || undefined,
        phone: photographer?.phone || undefined,
        email: photographer?.email || undefined,
        website: photographer?.website || undefined,
        businessAddress: photographer?.businessAddress || undefined,
        socialLinks: (photographer?.socialLinksJson as any) || undefined
      };
      
      // Render email blocks to HTML
      const blocksHtml = contentBlocksToHtml(automation.emailBlocks as any[], {
        baseUrl: process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'https://thephotocrm.com',
        brandingData: photographerBrandingData
      });
      
      // Apply branding (headers and signatures) for legacy automations
      const brandingData = {
        includeHeroImage: automation.includeHeroImage || false,
        heroImageUrl: automation.heroImageUrl || undefined,
        includeHeader: automation.includeHeader || false,
        headerStyle: automation.headerStyle || undefined,
        includeSignature: automation.includeSignature !== false, // default true
        signatureStyle: automation.signatureStyle || undefined,
        photographerId
      };
      
      htmlBody = await wrapEmailContent(blocksHtml, brandingData);
      textBody = automation.emailSubject || ''; // Simple text version
    } else if (template) {
      // Use existing template rendering
      subject = renderTemplate(template.subject || '', variables);
      htmlBody = renderTemplate(template.htmlBody || '', variables);
      textBody = renderTemplate(template.textBody || '', variables);
    } else {
      console.error('No email content available (neither blocks nor template)');
      await updateExecutionStatus(reservation.executionId!, 'FAILED');
      return;
    }

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
  // TODO: Payment reminders not yet implemented
  // This will need to query projectSmartFiles and check payment status
  return;
}

async function processNurtureAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing nurture automation: ${automation.name}`);
  
  // Find ACTIVE drip campaigns for this photographer and project type
  const activeCampaigns = await db
    .select()
    .from(dripCampaigns)
    .where(and(
      eq(dripCampaigns.photographerId, photographerId),
      eq(dripCampaigns.projectType, automation.projectType || 'WEDDING'),
      eq(dripCampaigns.status, 'ACTIVE'),
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
  // Find projects in the target stage that aren't already subscribed and have email opt-in and drip campaigns enabled
  const eligibleProjects = await db
    .select({
      id: projects.id,
      contactId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      emailOptIn: contacts.emailOptIn,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .leftJoin(dripCampaignSubscriptions, and(
      eq(dripCampaignSubscriptions.projectId, projects.id),
      eq(dripCampaignSubscriptions.campaignId, campaign.id)
    ))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.stageId, campaign.targetStageId),
      eq(projects.status, 'ACTIVE'),
      eq(projects.enableDripCampaigns, true), // Must have drip campaigns enabled
      eq(contacts.emailOptIn, true), // Must have email opt-in
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
    let nextEmailAt = new Date(now.getTime() + (firstEmailWeeks * 7 * 24 * 60 * 60 * 1000));
    
    // Get the first email to check for sendAtHour
    const firstEmail = campaign.emails?.[0];
    if (firstEmail?.sendAtHour !== null && firstEmail?.sendAtHour !== undefined) {
      // Set the time to the specified hour
      nextEmailAt.setHours(firstEmail.sendAtHour, 0, 0, 0);
      // If that time has already passed today, schedule for tomorrow
      if (nextEmailAt <= now) {
        nextEmailAt = new Date(nextEmailAt.getTime() + (24 * 60 * 60 * 1000));
      }
    }

    await db.insert(dripCampaignSubscriptions).values({
      campaignId: campaign.id,
      projectId: project.id,
      clientId: project.contactId,
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
  
  // Find active subscriptions that are ready for their next email (only for projects with drip campaigns enabled)
  const readySubscriptions = await db
    .select({
      subscription: dripCampaignSubscriptions,
      project: projects,
      contact: contacts
    })
    .from(dripCampaignSubscriptions)
    .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(dripCampaignSubscriptions.campaignId, campaign.id),
      eq(dripCampaignSubscriptions.status, 'ACTIVE'),
      lte(dripCampaignSubscriptions.nextEmailAt, now), // Ready to send
      eq(projects.status, 'ACTIVE'), // Project still active
      eq(projects.enableDripCampaigns, true) // Project has drip campaigns enabled
    ));

  console.log(`Found ${readySubscriptions.length} subscriptions ready for next email in campaign ${campaign.name}`);

  for (const { subscription, project, contact } of readySubscriptions) {
    await processSubscriptionEmail(subscription, campaign, project, contact, photographerId);
  }
}

async function processSubscriptionEmail(subscription: any, campaign: any, project: any, contact: any, photographerId: string): Promise<void> {
  console.log(`Processing subscription email for ${contact.firstName} ${contact.lastName}, next email index: ${subscription.nextEmailIndex}`);

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

  // Fetch gallery variables
  const galleryVars = await getGalleryVariables(project.id, photographerId, subscription.startedAt);
  
  // Prepare variables for template rendering
  const variables = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: `${contact.firstName} ${contact.lastName}`,
    email: contact.email || '',
    phone: contact.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    eventDate: project.eventDate ? new Date(project.eventDate).toLocaleDateString() : 'Not set',
    scheduling_link: schedulingLink,
    testimonials_link: `${baseUrl}/reviews/submit/${photographerId}`,
    ...galleryVars,
    // Uppercase versions for AI-generated placeholders
    SCHEDULING_LINK: schedulingLink,
    PHOTOGRAPHER_NAME: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    BUSINESS_NAME: photographer?.businessName || 'Your Photographer'
  };

  // Render email content
  const subject = renderTemplate(emailToSend.subject, variables);
  let htmlBody: string;
  
  // Prepare branding data for both builder and non-builder emails
  const brandingData = {
    businessName: photographer?.businessName,
    photographerName: photographer?.photographerName,
    logoUrl: photographer?.logoUrl,
    headshotUrl: photographer?.headshotUrl,
    brandPrimary: photographer?.brandPrimary,
    brandSecondary: photographer?.brandSecondary,
    phone: photographer?.phone,
    email: photographer?.emailFromAddr || photographer?.email,
    website: photographer?.website,
    businessAddress: photographer?.businessAddress,
    socialLinks: photographer?.socialLinks
  };
  
  // If using email builder, convert email blocks to HTML and add header/signature
  if (emailToSend.useEmailBuilder && emailToSend.emailBlocks) {
    const { contentBlocksToHtml } = await import('../../shared/template-utils.js');
    const { generateEmailHeader, generateEmailSignature } = await import('../../shared/email-branding-shared.js');
    
    try {
      const blocks = typeof emailToSend.emailBlocks === 'string' 
        ? JSON.parse(emailToSend.emailBlocks) 
        : emailToSend.emailBlocks;
      
      // Generate content blocks HTML WITHOUT wrapper (raw block markup only)
      const rawBlocksHtml = contentBlocksToHtml(blocks, {
        baseUrl: process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'https://thephotocrm.com',
        photographerToken: photographer?.publicToken,
        includeWrapper: false, // No grey container, just the clean block markup
        brandingData // For HEADER and SIGNATURE blocks
      });
      
      console.log('📧 Email builder content (no wrapper), length:', rawBlocksHtml.length);
      
      // Email builder: Use ONLY its own header/signature settings (NO fallback to photographer settings)
      const shouldIncludeHeader = emailToSend.includeHeader === true;
      const headerStyleToUse = emailToSend.headerStyle;
      
      const shouldIncludeSignature = emailToSend.includeSignature === true;
      const signatureStyleToUse = emailToSend.signatureStyle;
      
      const headerHtml = shouldIncludeHeader && headerStyleToUse
        ? generateEmailHeader(headerStyleToUse, brandingData)
        : '';
      
      const signatureHtml = shouldIncludeSignature && signatureStyleToUse
        ? generateEmailSignature(signatureStyleToUse, brandingData)
        : '';
      
      // Combine header + content + signature in a proper email structure
      // Gmail dark mode protection: use color-scheme meta tag and explicit colors with !important
      htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Email</title>
  <style>
    /* Force light mode colors - Gmail dark mode protection */
    body { background-color: #ffffff !important; }
    * { color-scheme: light only !important; }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; background-color: #ffffff !important;">
  <div style="max-width: 600px; margin: 0 auto;">
    ${headerHtml}
    ${rawBlocksHtml}
    ${signatureHtml}
  </div>
</body>
</html>`;
      
      console.log('📧 Final HTML lengths - Header:', headerHtml.length, 'Blocks:', rawBlocksHtml.length, 'Signature:', signatureHtml.length, 'Total:', htmlBody.length);
      
    } catch (error) {
      console.error('Error parsing email blocks:', error);
      htmlBody = renderTemplate(emailToSend.htmlBody, variables);
    }
  } else {
    // Use the raw HTML body for non-builder emails
    htmlBody = renderTemplate(emailToSend.htmlBody, variables);
    
    // Apply email branding wrapper for non-builder emails
    // Fall back to photographer's global settings if individual email doesn't specify
    const shouldIncludeHeader = emailToSend.includeHeader || (!emailToSend.includeHeader && photographer?.emailHeaderStyle);
    const headerStyleToUse = emailToSend.headerStyle || photographer?.emailHeaderStyle;
    
    const shouldIncludeSignature = emailToSend.includeSignature || (!emailToSend.includeSignature && photographer?.emailSignatureStyle);
    const signatureStyleToUse = emailToSend.signatureStyle || photographer?.emailSignatureStyle;
    
    if (shouldIncludeHeader || shouldIncludeSignature) {
      const { wrapEmailContent } = await import('./email-branding.js');
      htmlBody = wrapEmailContent(
        htmlBody,
        shouldIncludeHeader ? headerStyleToUse : null,
        shouldIncludeSignature ? signatureStyleToUse : null,
        brandingData
      );
    }
  }
  
  const textBody = renderTemplate(emailToSend.textBody || '', variables);

  // Create delivery record first
  const deliveryRecord = await db.insert(dripEmailDeliveries).values({
    subscriptionId: subscription.id,
    emailId: emailToSend.id,
    clientId: contact.id,
    projectId: project.id,
    status: 'PENDING'
  }).returning({ id: dripEmailDeliveries.id });

  const deliveryId = deliveryRecord[0].id;

  try {
    // Send email
    console.log(`📧 Sending drip email to ${contact.firstName} ${contact.lastName} (${contact.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(project.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    const success = await sendEmail({
      to: contact.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined,
      photographerId: contact.photographerId,
      clientId: contact.id,
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
      const minScheduleTime = new Date(now.getTime() + (campaign.emailFrequencyWeeks * 7 * 24 * 60 * 60 * 1000));
      let nextEmailAt = new Date(minScheduleTime);
      
      // Get the next email to check for sendAtHour
      const nextEmail = campaign.emails?.[nextEmailIndex];
      if (nextEmail?.sendAtHour !== null && nextEmail?.sendAtHour !== undefined) {
        // Set the time to the specified hour
        nextEmailAt.setHours(nextEmail.sendAtHour, 0, 0, 0);
        // If adjusted time is before minimum schedule time, bump forward by 24h
        while (nextEmailAt < minScheduleTime) {
          nextEmailAt = new Date(nextEmailAt.getTime() + (24 * 60 * 60 * 1000));
        }
      }

      await db
        .update(dripCampaignSubscriptions)
        .set({
          nextEmailIndex,
          nextEmailAt
        })
        .where(eq(dripCampaignSubscriptions.id, subscription.id));

      console.log(`✅ Sent drip email ${emailToSend.sequenceIndex} to ${contact.firstName} ${contact.lastName}. Next email scheduled for ${nextEmailAt}`);
    } else {
      // Mark delivery as failed
      await db
        .update(dripEmailDeliveries)
        .set({ status: 'FAILED' })
        .where(eq(dripEmailDeliveries.id, deliveryId));

      console.log(`❌ Failed to send drip email to ${contact.firstName} ${contact.lastName}`);
    }
  } catch (error) {
    console.error(`❌ Error sending drip email to ${contact.firstName} ${contact.lastName}:`, error);
    
    // Mark delivery as failed
    await db
      .update(dripEmailDeliveries)
      .set({ status: 'FAILED' })
      .where(eq(dripEmailDeliveries.id, deliveryId));
  }
}
