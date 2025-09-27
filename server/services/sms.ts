import { renderTemplate } from '@shared/template-utils';

// SimpleTexting API configuration
const SIMPLETEXTING_API_URL = 'https://api-app2.simpletexting.com/v2/api';

interface SmsParams {
  to: string;
  body: string;
}

interface SimpleTextingResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

export async function sendSms(params: SmsParams): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!process.env.SIMPLETEXTING_API_TOKEN) {
    console.warn('SimpleTexting API token not configured - skipping SMS');
    return { 
      success: false, 
      error: 'SMS service not configured' 
    };
  }

  if (!process.env.SIMPLETEXTING_PHONE_NUMBER) {
    console.error('SIMPLETEXTING_PHONE_NUMBER not set');
    return { 
      success: false, 
      error: 'SMS phone number not configured' 
    };
  }

  try {
    console.log('Sending SMS via SimpleTexting to:', params.to);
    console.log('From phone:', process.env.SIMPLETEXTING_PHONE_NUMBER);
    
    const requestPayload = {
      contactPhone: params.to,
      accountPhone: process.env.SIMPLETEXTING_PHONE_NUMBER,
      text: params.body
    };
    
    // Validate message body is not empty
    if (!params.body || params.body.trim() === '') {
      console.error('SMS body is empty or blank, aborting send');
      return {
        success: false,
        error: 'SMS message body cannot be empty'
      };
    }
    
    const response = await fetch(`${SIMPLETEXTING_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SIMPLETEXTING_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const responseData = await response.json() as SimpleTextingResponse;
    
    if (!response.ok) {
      console.error('SimpleTexting SMS error:', responseData);
      return { 
        success: false, 
        error: responseData.error || `HTTP ${response.status}: ${response.statusText}` 
      };
    }
    
    console.log('SMS sent successfully via SimpleTexting, ID:', responseData.message_id);
    return { success: true, sid: responseData.message_id };
  } catch (error: any) {
    console.error('SimpleTexting SMS error:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to send SMS' 
    };
  }
}

// Use the shared template utility
export function renderSmsTemplate(template: string, variables: Record<string, string>): string {
  return renderTemplate(template, variables);
}