import twilio from 'twilio';

// Use conditional initialization for development mode fallback
let client: twilio.Twilio | null = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} else {
  console.warn('Twilio credentials not found - SMS functionality will be disabled');
}

interface SmsParams {
  to: string;
  body: string;
}

export async function sendSms(params: SmsParams): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!client) {
    console.warn('Twilio client not initialized - skipping SMS');
    return { 
      success: false, 
      error: 'SMS service not configured' 
    };
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.error('TWILIO_PHONE_NUMBER not set');
    return { 
      success: false, 
      error: 'SMS phone number not configured' 
    };
  }

  try {
    console.log('Sending SMS to:', params.to);
    console.log('From phone:', process.env.TWILIO_PHONE_NUMBER);
    
    const message = await client.messages.create({
      body: params.body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to,
    });
    
    console.log('SMS sent successfully, SID:', message.sid);
    return { success: true, sid: message.sid };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    console.error('SMS error details:', {
      code: error?.code,
      message: error?.message,
      moreInfo: error?.moreInfo
    });
    return { 
      success: false, 
      error: error?.message || 'Failed to send SMS' 
    };
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
