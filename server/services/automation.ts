import { storage } from '../storage';
import { sendEmail, renderTemplate } from './email';
import { sendSms, renderSmsTemplate } from './sms';
import { db } from '../db';
import { clients, automations, automationSteps, stages, templates, emailLogs, smsLogs, photographers, estimates } from '@shared/schema';
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
      // Get automation steps
      const steps = await db
        .select()
        .from(automationSteps)
        .where(and(
          eq(automationSteps.automationId, automation.id),
          eq(automationSteps.enabled, true)
        ))
        .orderBy(automationSteps.stepIndex);

      // Get clients in this stage
      const clientsInStage = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.photographerId, photographerId),
          eq(clients.stageId, automation.stageId!)
        ));
        
      console.log(`Automation "${automation.name}" (${automation.id}) - found ${clientsInStage.length} clients in stage`);

      for (const client of clientsInStage) {
        for (const step of steps) {
          await processAutomationStep(client, step, automation);
        }
      }
    }
  } catch (error) {
    console.error('Error processing automations:', error);
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

  // Check if already sent successfully (only skip if status = 'sent')
  const alreadySent = automation.channel === 'EMAIL' 
    ? await db.select().from(emailLogs).where(and(
        eq(emailLogs.clientId, client.id),
        eq(emailLogs.automationStepId, step.id),
        eq(emailLogs.status, 'sent')
      ))
    : await db.select().from(smsLogs).where(and(
        eq(smsLogs.clientId, client.id),
        eq(smsLogs.automationStepId, step.id),
        eq(smsLogs.status, 'sent')
      ));

  if (alreadySent.length > 0) {
    console.log(`✅ Already sent successfully to ${client.firstName} ${client.lastName}, skipping`);
    return;
  }

  // Check for previous failed attempts (allow retry but log it)
  const failedAttempts = automation.channel === 'EMAIL' 
    ? await db.select().from(emailLogs).where(and(
        eq(emailLogs.clientId, client.id),
        eq(emailLogs.automationStepId, step.id),
        eq(emailLogs.status, 'failed')
      ))
    : await db.select().from(smsLogs).where(and(
        eq(smsLogs.clientId, client.id),
        eq(smsLogs.automationStepId, step.id),
        eq(smsLogs.status, 'failed')
      ));

  if (failedAttempts.length > 0) {
    console.log(`🔄 Retrying failed email for ${client.firstName} ${client.lastName} (${failedAttempts.length} previous failures)`);
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
    
    // Use photographer's verified sender or environment fallback
    const fromEmail = photographer?.emailFromAddr || process.env.SENDGRID_FROM_EMAIL || 'noreply@lazyphotog.com';
    const fromName = photographer?.emailFromName || process.env.SENDGRID_FROM_NAME || photographer?.businessName || 'Your Photographer';
    
    const success = await sendEmail({
      to: client.email,
      from: `${fromName} <${fromEmail}>`,
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

export async function processPaymentReminders(photographerId: string): Promise<void> {
  try {
    // Find estimates that are signed but not fully paid
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
