import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { MailService } from '@sendgrid/mail';
import { storage } from '../storage';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { renderTemplate } from '@shared/template-utils';

// SendGrid fallback for backward compatibility
const mailService = process.env.SENDGRID_API_KEY ? new MailService() : null;
if (mailService && process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string | string[];
  from?: string; // Optional - will use photographer's email if not provided
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  photographerId?: string; // Optional - if provided, use Gmail; otherwise fallback to SendGrid
  clientId?: string; // Optional - for logging to client history
  projectId?: string; // Optional - for logging to project history
  automationStepId?: string; // Optional - for tracking automation sends
  source?: 'AUTOMATION' | 'DRIP_CAMPAIGN' | 'MANUAL' | 'CLIENT_REPLY';
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

/**
 * Get OAuth2 client for a photographer with Gmail access
 */
async function getGmailClient(photographerId: string): Promise<OAuth2Client | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  
  // Load photographer's credentials
  const credentials = await storage.getGoogleCalendarCredentials(photographerId);
  
  if (!credentials || !credentials.accessToken) {
    console.error(`No Google credentials found for photographer ${photographerId}`);
    return null;
  }

  oauth2Client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
    expiry_date: credentials.expiryDate?.getTime()
  });

  return oauth2Client;
}

/**
 * Create RFC 2822 formatted email message
 */
function createRawEmail(params: EmailParams, fromEmail: string): string {
  const toAddresses = Array.isArray(params.to) ? params.to.join(', ') : params.to;
  const ccAddresses = params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : '';
  const bccAddresses = params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : '';

  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${toAddresses}`,
    ...(ccAddresses ? [`Cc: ${ccAddresses}`] : []),
    ...(bccAddresses ? [`Bcc: ${bccAddresses}`] : []),
    ...(params.replyTo ? [`Reply-To: ${params.replyTo}`] : []),
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    ...(params.html && params.text ? [
      'Content-Type: multipart/alternative; boundary="boundary"',
      '',
      '--boundary',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      params.text,
      '',
      '--boundary',
      'Content-Type: text/html; charset=UTF-8',
      '',
      params.html,
      '',
      '--boundary--'
    ] : params.html ? [
      'Content-Type: text/html; charset=UTF-8',
      '',
      params.html
    ] : [
      'Content-Type: text/plain; charset=UTF-8',
      '',
      params.text || ''
    ])
  ];

  return messageParts.join('\r\n');
}

/**
 * Send email via Gmail API (preferred) or SendGrid (fallback)
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  // If photographerId is provided, try Gmail first
  if (params.photographerId) {
    return sendViaGmail(params);
  }
  
  // Fallback to SendGrid for backward compatibility
  return sendViaSendGrid(params);
}

/**
 * Send email via Gmail API
 */
async function sendViaGmail(params: EmailParams): Promise<EmailResult> {
  try {
    if (!params.photographerId) {
      return {
        success: false,
        error: 'photographerId is required for Gmail'
      };
    }

    // Get Gmail client for this photographer
    const oauth2Client = await getGmailClient(params.photographerId);
    if (!oauth2Client) {
      // If Gmail is not available, fallback to SendGrid
      console.warn(`Gmail not connected for photographer ${params.photographerId}, falling back to SendGrid`);
      return sendViaSendGrid(params);
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get photographer's email address from users table
    const [user] = await db.select()
      .from(users)
      .where(eq(users.photographerId, params.photographerId))
      .limit(1);
    
    if (!user || !user.email) {
      return {
        success: false,
        error: 'Photographer email not found'
      };
    }

    const fromEmail = params.from || user.email;

    // Create RFC 2822 formatted email
    const rawEmail = createRawEmail(params, fromEmail);
    
    // Encode email in base64url format
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    const messageId = response.data.id;
    const threadId = response.data.threadId;

    // Log to email history
    await storage.createEmailHistory({
      photographerId: params.photographerId,
      clientId: params.clientId || null,
      projectId: params.projectId || null,
      automationStepId: params.automationStepId || null,
      direction: 'OUTBOUND',
      fromEmail: fromEmail,
      toEmails: Array.isArray(params.to) ? params.to : [params.to],
      ccEmails: params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : null,
      bccEmails: params.bcc ? (Array.isArray(params.bcc) ? params.bcc : [params.bcc]) : null,
      subject: params.subject,
      htmlBody: params.html || null,
      textBody: params.text || null,
      gmailMessageId: messageId || null,
      gmailThreadId: threadId || null,
      source: params.source || 'MANUAL',
      status: 'SENT'
    });

    console.log(`✅ Email sent via Gmail: ${params.subject} to ${params.to}`);

    return {
      success: true,
      messageId,
      threadId
    };

  } catch (error: any) {
    console.error('Gmail send error:', error);
    console.warn('Falling back to SendGrid due to Gmail error');
    
    // Fallback to SendGrid on any Gmail error
    return sendViaSendGrid(params);
  }
}

/**
 * Send email via SendGrid (legacy/fallback)
 */
async function sendViaSendGrid(params: EmailParams): Promise<EmailResult> {
  if (!mailService) {
    console.error('SendGrid not configured and Gmail not available');
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  try {
    // Parse the from parameter to separate email and name
    const fromParam = params.from || 'noreply@example.com';
    let fromEmail = fromParam;
    let fromName = '';
    
    // Handle both "Name <email>" format and plain email
    const fromMatch = fromParam.match(/^(.+?)\s*<(.+?)>$/);
    if (fromMatch) {
      fromName = fromMatch[1].trim();
      fromEmail = fromMatch[2].trim();
    }

    const emailData: any = {
      to: Array.isArray(params.to) ? params.to : [params.to],
      from: {
        email: fromEmail,
        name: fromName || fromEmail
      },
      subject: params.subject,
    };

    // Add CC if provided
    if (params.cc) {
      emailData.cc = Array.isArray(params.cc) ? params.cc : [params.cc];
    }

    // Add BCC if provided
    if (params.bcc) {
      emailData.bcc = Array.isArray(params.bcc) ? params.bcc : [params.bcc];
    }

    // Add reply-to if provided
    if (params.replyTo) {
      const replyToMatch = params.replyTo.match(/^(.+?)\s*<(.+?)>$/);
      if (replyToMatch) {
        emailData.reply_to = {
          email: replyToMatch[2].trim(),
          name: replyToMatch[1].trim()
        };
      } else {
        emailData.reply_to = params.replyTo;
      }
    }

    // Only include text/html if provided
    if (params.text) {
      emailData.text = params.text;
    }
    if (params.html) {
      emailData.html = params.html;
    }

    await mailService.send(emailData);
    console.log(`✅ Email sent via SendGrid: ${params.subject} to ${params.to}`);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return {
      success: false,
      error: error.message || 'Failed to send email via SendGrid'
    };
  }
}

// Re-export the shared template utility for backward compatibility
export { renderTemplate } from '@shared/template-utils';
