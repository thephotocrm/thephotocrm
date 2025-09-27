import { renderTemplate } from '@shared/template-utils';

// SimpleTexting API configuration
const SIMPLETEXTING_API_URL = 'https://api-app2.simpletexting.com/v2/api';

/**
 * Sanitizes and formats phone numbers for SimpleTexting API compatibility
 * Handles various input formats from photographers and converts to E.164 format
 */
function sanitizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Invalid phone number: must be a non-empty string');
  }

  // Remove all Unicode directional marks and invisible characters that can break SMS APIs
  let cleaned = phoneNumber
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '') // Remove bidirectional text markers
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, '') // Remove various unicode spaces
    .replace(/[\u200B-\u200D]/g, ''); // Remove zero-width characters

  // Extract only digits and + sign
  cleaned = cleaned.replace(/[^\d+]/g, '');

  // Handle different formats and convert to E.164
  if (cleaned.startsWith('+1')) {
    // Already has US country code
    if (cleaned.length === 12) {
      return cleaned; // +1XXXXXXXXXX
    }
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    // US number with country code but no +
    return '+' + cleaned;
  } else if (cleaned.length === 10) {
    // US number without country code
    return '+1' + cleaned;
  } else if (cleaned.startsWith('+') && cleaned.length > 10) {
    // International number
    return cleaned;
  }

  // If we can't determine format, assume US 10-digit and add +1
  const digitsOnly = cleaned.replace(/[^\d]/g, '');
  if (digitsOnly.length === 10) {
    return '+1' + digitsOnly;
  }

  throw new Error(`Unable to format phone number: ${phoneNumber} (cleaned: ${cleaned})`);
}

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
    // Sanitize the phone number to ensure SimpleTexting compatibility
    let sanitizedPhone: string;
    try {
      sanitizedPhone = sanitizePhoneNumber(params.to);
      console.log('Phone number sanitized:', params.to, '->', sanitizedPhone);
    } catch (sanitizeError) {
      console.error('Phone number sanitization failed:', sanitizeError);
      return {
        success: false,
        error: `Invalid phone number format: ${params.to}`
      };
    }

    console.log('Sending SMS via SimpleTexting to:', sanitizedPhone);
    console.log('From phone:', process.env.SIMPLETEXTING_PHONE_NUMBER);
    
    const requestPayload = {
      contactPhone: sanitizedPhone,
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