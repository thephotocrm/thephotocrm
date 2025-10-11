import { renderTemplate } from '@shared/template-utils';
import twilio from 'twilio';

// Twilio client initialization with Replit connector
let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

/**
 * Sanitizes and formats phone numbers for Twilio API compatibility
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

export async function sendSms(params: SmsParams): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    // Validate message body is not empty
    if (!params.body || params.body.trim() === '') {
      console.error('SMS body is empty or blank, aborting send');
      return {
        success: false,
        error: 'SMS message body cannot be empty'
      };
    }

    // Get Twilio client and phone number
    const client = await getTwilioClient();
    const fromPhone = await getTwilioFromPhoneNumber();

    if (!fromPhone) {
      console.error('Twilio phone number not configured');
      return {
        success: false,
        error: 'SMS phone number not configured'
      };
    }

    // Sanitize the recipient phone number
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

    console.log('Sending SMS via Twilio to:', sanitizedPhone);
    console.log('From phone:', fromPhone);

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: params.body,
      from: fromPhone,
      to: sanitizedPhone
    });

    console.log('SMS sent successfully via Twilio, SID:', message.sid);
    return { success: true, sid: message.sid };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
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
