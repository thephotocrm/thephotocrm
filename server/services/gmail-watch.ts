import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';

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
 * Get the webhook URL for Gmail push notifications
 */
function getGmailWebhookUrl(): string {
  // Production environment
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhooks/gmail/push`;
  }
  
  // Replit development
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/webhooks/gmail/push`;
  }
  
  // Fallback to main domain
  return 'https://app.thephotocrm.com/webhooks/gmail/push';
}

/**
 * Set up Gmail watch for a photographer to receive push notifications
 * @param photographerId The photographer's ID
 * @returns True if watch was set up successfully
 */
export async function setupGmailWatch(photographerId: string): Promise<boolean> {
  try {
    const oauth2Client = await getGmailClient(photographerId);
    if (!oauth2Client) {
      console.error(`Cannot set up Gmail watch: OAuth client not available for photographer ${photographerId}`);
      return false;
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Get the Cloud Pub/Sub topic for Gmail push notifications
    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) {
      console.error('Gmail Pub/Sub topic not configured - set GMAIL_PUBSUB_TOPIC environment variable');
      return false;
    }

    // Set up watch request
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'], // Only watch inbox messages
        labelFilterBehavior: 'INCLUDE'
      }
    });

    const { historyId, expiration } = response.data;
    
    if (!historyId || !expiration) {
      console.error('Gmail watch response missing historyId or expiration');
      return false;
    }

    // Convert expiration from milliseconds to Date
    const expirationDate = new Date(parseInt(expiration));
    
    // Store the watch details in the database
    await storage.updatePhotographer(photographerId, {
      gmailHistoryId: historyId,
      gmailWatchExpiration: expirationDate,
      gmailWatchSetupAt: new Date()
    });

    console.log(`✅ Gmail watch set up for photographer ${photographerId}`);
    console.log(`   History ID: ${historyId}`);
    console.log(`   Expires: ${expirationDate.toISOString()}`);

    return true;
  } catch (error: any) {
    // Handle specific Gmail API errors
    if (error.code === 403) {
      console.error(`Gmail watch setup failed: Insufficient permissions for photographer ${photographerId}`);
      console.error('Make sure Gmail API is enabled and OAuth consent includes Gmail scope');
    } else if (error.code === 429) {
      console.error(`Gmail watch setup rate limited for photographer ${photographerId}`);
      console.error('Too many watch requests - will retry later');
    } else if (error.code === 400) {
      console.error(`Gmail watch setup invalid request for photographer ${photographerId}:`, error.message);
    } else {
      console.error(`Error setting up Gmail watch for photographer ${photographerId}:`, error);
    }
    return false;
  }
}

/**
 * Renew Gmail watch for a photographer (watches expire after 7 days)
 * @param photographerId The photographer's ID
 * @returns True if watch was renewed successfully
 */
export async function renewGmailWatch(photographerId: string): Promise<boolean> {
  console.log(`Renewing Gmail watch for photographer ${photographerId}`);
  return await setupGmailWatch(photographerId);
}

/**
 * Stop Gmail watch for a photographer
 * @param photographerId The photographer's ID
 * @returns True if watch was stopped successfully
 */
export async function stopGmailWatch(photographerId: string): Promise<boolean> {
  try {
    const oauth2Client = await getGmailClient(photographerId);
    if (!oauth2Client) {
      return false;
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    await gmail.users.stop({
      userId: 'me'
    });

    // Clear watch details from database
    await storage.updatePhotographer(photographerId, {
      gmailHistoryId: null,
      gmailWatchExpiration: null,
      gmailWatchSetupAt: null
    });

    console.log(`✅ Gmail watch stopped for photographer ${photographerId}`);
    return true;
  } catch (error: any) {
    console.error(`Error stopping Gmail watch for photographer ${photographerId}:`, error);
    return false;
  }
}

/**
 * Check and renew expiring Gmail watches for all photographers
 * This should be called periodically (e.g., daily cron job)
 */
export async function renewExpiringWatches(): Promise<void> {
  try {
    console.log('🔄 Checking for expiring Gmail watches...');
    
    // Get all photographers with Gmail watches
    const photographers = await storage.getPhotographersWithGmailWatch();
    
    if (photographers.length === 0) {
      console.log('No photographers with active Gmail watches');
      return;
    }

    console.log(`Found ${photographers.length} photographers with Gmail watches`);
    
    // Renew watches expiring in the next 24 hours
    const now = new Date();
    const renewThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    let renewed = 0;
    let failed = 0;
    
    for (const photographer of photographers) {
      // Add delay between requests to respect rate limits (500ms)
      if (renewed > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!photographer.gmailWatchExpiration) {
        console.log(`Photographer ${photographer.id} has no expiration date, setting up watch`);
        const success = await setupGmailWatch(photographer.id);
        if (success) {
          renewed++;
        } else {
          failed++;
        }
        continue;
      }
      
      if (photographer.gmailWatchExpiration < renewThreshold) {
        console.log(`Renewing Gmail watch for photographer ${photographer.id} (expires ${photographer.gmailWatchExpiration.toISOString()})`);
        const success = await renewGmailWatch(photographer.id);
        if (success) {
          renewed++;
        } else {
          failed++;
        }
      }
    }
    
    console.log(`✅ Finished checking Gmail watches: ${renewed} renewed, ${failed} failed`);
  } catch (error: any) {
    console.error('Error renewing expiring Gmail watches:', error);
  }
}
