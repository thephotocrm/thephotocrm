import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { MailService } from '@sendgrid/mail';
import { storage } from '../storage';
import { db } from '../db';
import { users, photographers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { renderTemplate } from '@shared/template-utils';
import { wrapEmailContent, BrandingData } from './email-branding';
import crypto from 'crypto';

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
 * Generate HMAC signature for email reply tracking
 * @param projectId The project ID
 * @param contactId The contact ID
 * @returns Base64-encoded HMAC signature
 */
function generateEmailSignature(projectId: string, contactId: string): string {
  const secret = process.env.EMAIL_SIGNATURE_SECRET || 'default-secret-change-in-production';
  const data = `${projectId}:${contactId}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64');
}

/**
 * Verify HMAC signature for incoming email replies
 * @param signature The HMAC signature from the email header
 * @param projectId The project ID
 * @param contactId The contact ID
 * @returns True if signature is valid
 */
export function verifyEmailSignature(signature: string, projectId: string, contactId: string): boolean {
  const expectedSignature = generateEmailSignature(projectId, contactId);
  return signature === expectedSignature;
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

  // Generate tracking headers for email reply threading
  const trackingHeaders: string[] = [];
  if (params.projectId) {
    trackingHeaders.push(`X-TPC-Project: ${params.projectId}`);
  }
  if (params.clientId) {
    trackingHeaders.push(`X-TPC-Contact: ${params.clientId}`);
  }
  if (params.projectId && params.clientId) {
    const signature = generateEmailSignature(params.projectId, params.clientId);
    trackingHeaders.push(`X-TPC-Signature: ${signature}`);
  }

  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${toAddresses}`,
    ...(ccAddresses ? [`Cc: ${ccAddresses}`] : []),
    ...(bccAddresses ? [`Bcc: ${bccAddresses}`] : []),
    ...(params.replyTo ? [`Reply-To: ${params.replyTo}`] : []),
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    ...trackingHeaders,
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

    // Get photographer's branding settings
    const [photographer] = await db.select()
      .from(photographers)
      .where(eq(photographers.id, params.photographerId))
      .limit(1);

    // Apply email branding if HTML content exists and branding is configured
    // SKIP for drip campaigns and automations - they have their own independent branding
    let finalHtml = params.html;
    if (photographer && finalHtml && params.source !== 'DRIP_CAMPAIGN' && params.source !== 'AUTOMATION') {
      const brandingData: BrandingData = {
        businessName: photographer.businessName || undefined,
        photographerName: photographer.photographerName || undefined,
        logoUrl: photographer.logoUrl || undefined,
        headshotUrl: photographer.headshotUrl || undefined,
        brandPrimary: photographer.brandPrimary || undefined,
        brandSecondary: photographer.brandSecondary || undefined,
        phone: photographer.phone || undefined,
        email: user.email,
        website: photographer.website || undefined,
        businessAddress: photographer.businessAddress || undefined,
        socialLinks: (photographer.socialLinksJson as any) || undefined
      };

      // Wrap email content with header and signature (for manual emails only)
      finalHtml = wrapEmailContent(
        finalHtml,
        photographer.emailHeaderStyle,
        photographer.emailSignatureStyle,
        brandingData
      );
    }

    // Create RFC 2822 formatted email
    const rawEmail = createRawEmail({ ...params, html: finalHtml }, fromEmail);
    
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

    // Log to email history (use finalHtml to store the branded version)
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
      htmlBody: finalHtml || null,
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

    // Apply email branding if photographerId is provided and HTML content exists
    // SKIP for drip campaigns and automations - they have their own independent branding
    let finalHtml = params.html;
    if (params.photographerId && finalHtml && params.source !== 'DRIP_CAMPAIGN' && params.source !== 'AUTOMATION') {
      // Get photographer's branding settings
      const [photographer] = await db.select()
        .from(photographers)
        .where(eq(photographers.id, params.photographerId))
        .limit(1);

      if (photographer) {
        const brandingData: BrandingData = {
          businessName: photographer.businessName || undefined,
          photographerName: photographer.photographerName || undefined,
          logoUrl: photographer.logoUrl || undefined,
          headshotUrl: photographer.headshotUrl || undefined,
          brandPrimary: photographer.brandPrimary || undefined,
          brandSecondary: photographer.brandSecondary || undefined,
          phone: photographer.phone || undefined,
          email: fromEmail,
          website: photographer.website || undefined,
          businessAddress: photographer.businessAddress || undefined,
          socialLinks: (photographer.socialLinksJson as any) || undefined
        };

        // Wrap email content with header and signature (for manual emails only)
        finalHtml = wrapEmailContent(
          finalHtml,
          photographer.emailHeaderStyle,
          photographer.emailSignatureStyle,
          brandingData
        );
      }
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
    if (finalHtml) {
      emailData.html = finalHtml;
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

/**
 * Fetch and process an incoming Gmail message
 */
export async function fetchIncomingGmailMessage(photographerId: string, messageId: string): Promise<EmailResult> {
  try {
    // Get Gmail client for this photographer
    const oauth2Client = await getGmailClient(photographerId);
    if (!oauth2Client) {
      return {
        success: false,
        error: 'Gmail not connected for photographer'
      };
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch the message with full format to get headers and body
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = messageResponse.data;
    const payload = message.payload;
    const headers = payload?.headers || [];

    // Extract email metadata from headers
    const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const toHeader = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
    const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
    const ccHeader = headers.find(h => h.name?.toLowerCase() === 'cc')?.value || '';

    // Extract email address from "Name <email>" format
    const extractEmail = (header: string): string => {
      const match = header.match(/<(.+?)>/);
      return match ? match[1] : header.trim();
    };

    const fromEmail = fromHeader ? extractEmail(fromHeader) : '';
    const toEmails = toHeader ? toHeader.split(',').map(e => extractEmail(e)) : [];
    const ccEmails = ccHeader ? ccHeader.split(',').map(e => extractEmail(e)) : [];

    // Extract message body
    let textBody = '';
    let htmlBody = '';

    const getBody = (part: any): void => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        part.parts.forEach(getBody);
      }
    };

    if (payload) {
      getBody(payload);
    }

    // Find the client by email
    const client = await storage.getClientByEmail(fromEmail, photographerId);
    
    if (!client) {
      console.warn(`Received email from unknown sender: ${fromEmail}`);
      // Still log the email but without client association
    }

    // Get active project for this client if found
    let projectId = null;
    if (client) {
      const projects = await storage.getProjectsByClient(client.id);
      const activeProject = projects.find(p => p.status === 'ACTIVE') || projects[0];
      projectId = activeProject?.id || null;
    }

    // Log to email history
    await storage.createEmailHistory({
      photographerId,
      clientId: client?.id || null,
      projectId: projectId,
      automationStepId: null,
      direction: 'INBOUND',
      fromEmail,
      toEmails,
      ccEmails: ccEmails.length > 0 ? ccEmails : null,
      bccEmails: null,
      subject: subjectHeader,
      htmlBody: htmlBody || null,
      textBody: textBody || null,
      gmailMessageId: message.id || null,
      gmailThreadId: message.threadId || null,
      source: 'CLIENT_REPLY',
      status: 'RECEIVED'
    });

    console.log(`✅ Incoming email processed: ${subjectHeader} from ${fromEmail}`);

    return {
      success: true,
      messageId: message.id || undefined,
      threadId: message.threadId || undefined
    };

  } catch (error: any) {
    console.error('Error fetching incoming Gmail message:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch Gmail message'
    };
  }
}

/**
 * Render magic link email template
 */
export function renderMagicLinkEmail(params: {
  photographer: { businessName: string; logoUrl?: string };
  contact: { firstName?: string; lastName?: string; email: string };
  loginUrl: string;
}): { subject: string; text: string; html: string } {
  const { photographer, contact, loginUrl } = params;
  const displayName = contact.firstName ? `${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}` : contact.email;

  const subject = `Sign in to ${photographer.businessName}`;

  const text = `Hi ${displayName},

Click the link below to securely sign in to your client portal:

${loginUrl}

This link will expire in 30 minutes for security.

Alternatively, you can sign in with your password at your portal.

${photographer.businessName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      ${photographer.logoUrl ? `
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${photographer.logoUrl}" alt="${photographer.businessName}" style="max-width: 150px; height: auto;" />
        </div>
      ` : `
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="margin: 0; color: #333; font-size: 24px;">${photographer.businessName}</h2>
        </div>
      `}
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">Sign in to your portal</h1>
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
          Hi ${displayName}, click the button below to securely access your client portal.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Sign In Now
          </a>
        </div>
        
        <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
          This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; color: #9ca3af; font-size: 13px;">
        <p style="margin: 0;">
          Or copy and paste this link into your browser:<br/>
          <span style="color: #6b7280;">${loginUrl}</span>
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

// Re-export the shared template utility for backward compatibility
export { renderTemplate } from '@shared/template-utils';
