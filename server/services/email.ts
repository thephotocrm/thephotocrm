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
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };

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
    return false;
  }
}

// Re-export the shared template utility for backward compatibility
export { renderTemplate } from '@shared/template-utils';
