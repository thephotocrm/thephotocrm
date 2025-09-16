import { MailService } from '@sendgrid/mail';

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
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    // Support both {variable} and {{variable}} formats
    const singleBrace = `{${key}}`;
    const doubleBrace = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(singleBrace, 'g'), value);
    rendered = rendered.replace(new RegExp(doubleBrace, 'g'), value);
  }
  
  return rendered;
}
