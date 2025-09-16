import { MailService } from '@sendgrid/mail';
import { renderTemplate } from '@shared/template-utils';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Parse the from parameter to separate email and name
    let fromEmail = params.from;
    let fromName = '';
    
    // Handle both "Name <email>" format and plain email
    const fromMatch = params.from.match(/^(.+?)\s*<(.+?)>$/);
    if (fromMatch) {
      fromName = fromMatch[1].trim();
      fromEmail = fromMatch[2].trim();
    }

    const emailData: any = {
      to: params.to,
      from: {
        email: fromEmail,
        name: fromName || fromEmail
      },
      subject: params.subject,
    };

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
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    // Log the specific error details to debug 403 issues
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return false;
  }
}

// Re-export the shared template utility for backward compatibility
export { renderTemplate } from '@shared/template-utils';
