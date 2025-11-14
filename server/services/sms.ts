import { renderTemplate } from '@shared/template-utils';
import twilio from 'twilio';

// Twilio client initialization - supports both Replit connector (dev) and Railway env vars (production)
let connectionSettings: any;

async function getCredentials() {
  // Try Replit connector first (dev environment)
  if (process.env.REPLIT_CONNECTORS_HOSTNAME) {
    console.log('Using Replit connector for Twilio credentials');
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken) {
      console.warn('REPLIT_CONNECTORS_HOSTNAME found but no X_REPLIT_TOKEN, falling back to env vars');
    } else {
      try {
        connectionSettings = await fetch(
          'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
          {
            headers: {
              'Accept': 'application/json',
              'X_REPLIT_TOKEN': xReplitToken
            }
          }
        ).then(res => res.json()).then(data => data.items?.[0]);

        if (connectionSettings?.settings?.account_sid && connectionSettings?.settings?.api_key && connectionSettings?.settings?.api_key_secret) {
          console.log('✅ Twilio credentials loaded from Replit connector');
          return {
            accountSid: connectionSettings.settings.account_sid,
            apiKey: connectionSettings.settings.api_key,
            apiKeySecret: connectionSettings.settings.api_key_secret,
            phoneNumber: connectionSettings.settings.phone_number
          };
        }
      } catch (error) {
        console.warn('Failed to fetch Twilio from Replit connector, falling back to env vars:', error);
      }
    }
  }

  // Fall back to Railway environment variables (production)
  console.log('Using environment variables for Twilio credentials');
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Twilio credentials not found. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.');
  }

  console.log('✅ Twilio credentials loaded from environment variables');
  return {
    accountSid,
    authToken, // Note: Using authToken directly for production
    phoneNumber
  };
}

async function getTwilioClient() {
  const credentials = await getCredentials();
  
  // Replit connector uses apiKey/apiKeySecret
  if (credentials.apiKey && credentials.apiKeySecret) {
    return twilio(credentials.apiKey, credentials.apiKeySecret, {
      accountSid: credentials.accountSid
    });
  }
  
  // Railway/production uses authToken
  if (credentials.authToken) {
    return twilio(credentials.accountSid, credentials.authToken);
  }
  
  throw new Error('Invalid Twilio credentials format');
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
  mediaUrl?: string; // Optional image URL for MMS
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
    if (params.mediaUrl) {
      console.log('Including MMS image:', params.mediaUrl);
    }

    // Build message payload
    const messagePayload: any = {
      body: params.body,
      from: fromPhone,
      to: sanitizedPhone
    };

    // Only include status callback if we have a valid public domain
    // Localhost URLs are rejected by Twilio and cause "invalid URL" errors
    let statusCallbackUrl: string | undefined;
    
    if (process.env.REPLIT_DEV_DOMAIN) {
      // Replit development
      statusCallbackUrl = `https://${process.env.REPLIT_DEV_DOMAIN}/webhooks/twilio/status`;
    } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      // Railway production
      statusCallbackUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhooks/twilio/status`;
    } else if (process.env.NODE_ENV === 'production') {
      // Fallback to main CRM domain for production
      statusCallbackUrl = 'https://thephotocrm.com/webhooks/twilio/status';
    }
    
    if (statusCallbackUrl) {
      messagePayload.statusCallback = statusCallbackUrl;
      console.log('Status callback URL:', statusCallbackUrl);
    } else {
      console.log('No public domain available, skipping status callback');
    }

    // Add media URL if provided (for MMS)
    if (params.mediaUrl) {
      messagePayload.mediaUrl = [params.mediaUrl];
    }

    // Send SMS/MMS via Twilio
    const message = await client.messages.create(messagePayload);

    console.log('Message sent successfully via Twilio, SID:', message.sid);
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
