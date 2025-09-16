import { Twilio } from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
  throw new Error("Twilio environment variables must be set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER");
}

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SmsParams {
  to: string;
  body: string;
}

export async function sendSms(params: SmsParams): Promise<{ success: boolean; sid?: string }> {
  try {
    const message = await client.messages.create({
      body: params.body,
      from: process.env.TWILIO_FROM_NUMBER,
      to: params.to,
    });
    
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return { success: false };
  }
}

export function renderSmsTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return rendered;
}
