import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';

// Types for calendar events
export interface CalendarEventDetails {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails?: string[];
  timeZone?: string;
  location?: string;
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  googleMeetLink?: string;
  error?: string;
}

export interface OAuthState {
  photographerId: string;
  nonce: string;
  timestamp: number;
}

export interface SignedOAuthState {
  payload: string; // base64url encoded OAuthState
  signature: string; // HMAC signature
}

/**
 * Secure Google Calendar Service with per-photographer OAuth clients
 * Fixes critical security vulnerabilities in the previous global singleton approach
 */
export class GoogleCalendarService {
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  private static readonly REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:5000/api/auth/google-calendar/callback`;

  private clientId: string | null;
  private clientSecret: string | null;
  private readonly hmacSecret: string;

  private static readonly HMAC_ALGORITHM = 'sha256';
  private static readonly STATE_SEPARATOR = '.';

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || null;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || null;
    
    // Use dedicated HMAC secret or fallback to client secret for backward compatibility
    this.hmacSecret = process.env.GOOGLE_OAUTH_HMAC_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'fallback-dev-secret';

    if (!this.clientId || !this.clientSecret) {
      console.warn('Google Calendar: Missing environment variables GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Calendar integration disabled.');
    }
    
    if (!process.env.GOOGLE_OAUTH_HMAC_SECRET && process.env.NODE_ENV === 'production') {
      console.warn('Google Calendar: GOOGLE_OAUTH_HMAC_SECRET not set in production. Using GOOGLE_CLIENT_SECRET as HMAC key.');
    }
  }

  /**
   * Generate HMAC signature for state payload
   */
  private generateHMACSignature(payload: string): string {
    return crypto.createHmac(GoogleCalendarService.HMAC_ALGORITHM, this.hmacSecret)
      .update(payload)
      .digest('base64url');
  }

  /**
   * Verify HMAC signature for state payload
   */
  private verifyHMACSignature(payload: string, signature: string): boolean {
    const expectedSignature = this.generateHMACSignature(payload);
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    try {
      const expectedBuffer = Buffer.from(expectedSignature);
      const actualBuffer = Buffer.from(signature);
      
      // Signatures must be same length to use timingSafeEqual
      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Create a secure OAuth2 client for a specific photographer
   */
  private createOAuth2Client(photographerId?: string): OAuth2Client | null {
    if (!this.clientId || !this.clientSecret) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      GoogleCalendarService.REDIRECT_URI
    );

    // If photographer ID provided, load their credentials
    if (photographerId) {
      this.loadPhotographerCredentials(oauth2Client, photographerId);
    }

    return oauth2Client;
  }

  /**
   * Load photographer's stored credentials into OAuth2 client
   */
  private async loadPhotographerCredentials(oauth2Client: OAuth2Client, photographerId: string): Promise<boolean> {
    try {
      const credentials = await storage.getGoogleCalendarCredentials(photographerId);
      
      if (!credentials || !credentials.accessToken) {
        return false;
      }

      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiryDate?.getTime(),
        scope: credentials.scope
      });

      return true;
    } catch (error) {
      console.error(`Failed to load credentials for photographer ${photographerId}:`, error);
      return false;
    }
  }

  /**
   * Generate secure OAuth authorization URL with HMAC-signed state parameter for CSRF protection
   */
  async getAuthUrl(photographerId: string): Promise<{ url: string; state: string } | null> {
    try {
      const oauth2Client = this.createOAuth2Client();
      if (!oauth2Client) {
        console.warn('Google Calendar not configured - cannot generate auth URL');
        return null;
      }
      
      // Create secure state parameter with photographer ID and nonce
      const state: OAuthState = {
        photographerId,
        nonce: nanoid(),
        timestamp: Date.now()
      };

      // Encode the state payload
      const payloadString = Buffer.from(JSON.stringify(state)).toString('base64url');
      
      // Generate HMAC signature for the payload
      const signature = this.generateHMACSignature(payloadString);
      
      // Create signed state: payload.signature
      const signedState = `${payloadString}${GoogleCalendarService.STATE_SEPARATOR}${signature}`;

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GoogleCalendarService.SCOPES,
        prompt: 'consent',
        state: signedState
      });

      console.log(`Generated secure OAuth URL for photographer ${photographerId}`);
      return { url, state: signedState };
    } catch (error) {
      console.error('Error generating auth URL:', error);
      return null;
    }
  }

  /**
   * Securely validate HMAC-signed state parameter and extract photographer ID
   * SECURITY: Prevents account linking attacks by verifying cryptographic signatures
   */
  validateState(stateString: string): { photographerId: string; valid: boolean } {
    try {
      // Parse signed state format: payload.signature
      const parts = stateString.split(GoogleCalendarService.STATE_SEPARATOR);
      if (parts.length !== 2) {
        console.warn('Invalid state format: missing signature component');
        return { photographerId: '', valid: false };
      }

      const [payloadString, signature] = parts;

      // Verify HMAC signature first (prevents processing of forged states)
      if (!this.verifyHMACSignature(payloadString, signature)) {
        console.error('SECURITY ALERT: Invalid state signature detected - possible forgery attempt');
        return { photographerId: '', valid: false };
      }

      // Decode and parse the payload only after signature verification
      const stateJson = Buffer.from(payloadString, 'base64url').toString();
      const state: OAuthState = JSON.parse(stateJson);

      // Validate timestamp (state should not be older than 1 hour)
      const oneHourMs = 60 * 60 * 1000;
      const timestampValid = (Date.now() - state.timestamp) < oneHourMs;
      
      // Validate required fields
      const fieldsValid = !!state.photographerId && !!state.nonce;

      const isValid = timestampValid && fieldsValid;
      
      if (isValid) {
        console.log(`Valid signed state verified for photographer ${state.photographerId}`);
      } else {
        console.warn(`Invalid state: timestamp=${timestampValid}, fields=${fieldsValid}`);
      }

      return {
        photographerId: state.photographerId,
        valid: isValid
      };
    } catch (error) {
      console.error('State validation error:', error);
      return { photographerId: '', valid: false };
    }
  }

  /**
   * Exchange authorization code for access tokens and store them securely
   */
  async exchangeCodeForTokens(code: string, photographerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const oauth2Client = this.createOAuth2Client();
      if (!oauth2Client) {
        return { success: false, error: 'Google Calendar not configured' };
      }
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        return { success: false, error: 'No access token received' };
      }

      // Store credentials securely for this photographer
      await storage.storeGoogleCalendarCredentials(photographerId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scope: Array.isArray(tokens.scope) ? tokens.scope.join(' ') : tokens.scope
      });
      
      console.log(`Calendar tokens stored successfully for photographer ${photographerId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error exchanging code for tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh expired tokens for a photographer using modern Google Auth Library methods
   */
  async refreshTokens(photographerId: string): Promise<boolean> {
    try {
      const oauth2Client = this.createOAuth2Client();
      if (!oauth2Client) {
        console.warn('Google Calendar not configured - cannot refresh tokens');
        return false;
      }
      
      const credentialsLoaded = await this.loadPhotographerCredentials(oauth2Client, photographerId);
      if (!credentialsLoaded) {
        console.warn(`No credentials loaded for photographer ${photographerId}`);
        return false;
      }

      // Check if refresh token exists
      const currentCredentials = oauth2Client.credentials;
      if (!currentCredentials.refresh_token) {
        console.warn(`No refresh token available for photographer ${photographerId}`);
        return false;
      }

      // Use modern getAccessToken() which handles refresh automatically
      const { token } = await oauth2Client.getAccessToken();
      
      if (!token) {
        console.error(`Failed to get access token for photographer ${photographerId}`);
        return false;
      }

      // Get the updated credentials after automatic refresh
      const updatedCredentials = oauth2Client.credentials;
      
      if (!updatedCredentials.access_token) {
        console.error(`No access token in refreshed credentials for photographer ${photographerId}`);
        return false;
      }

      // Update stored credentials with refreshed tokens
      await storage.storeGoogleCalendarCredentials(photographerId, {
        accessToken: updatedCredentials.access_token,
        refreshToken: updatedCredentials.refresh_token || currentCredentials.refresh_token,
        expiryDate: updatedCredentials.expiry_date ? new Date(updatedCredentials.expiry_date) : undefined,
        scope: Array.isArray(updatedCredentials.scope) 
          ? updatedCredentials.scope.join(' ') 
          : updatedCredentials.scope || currentCredentials.scope
      });

      console.log(`Successfully refreshed tokens for photographer ${photographerId}`);
      return true;
    } catch (error: any) {
      console.error(`Failed to refresh tokens for photographer ${photographerId}:`, error.message);
      
      // Handle specific error cases
      if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired or revoked')) {
        console.warn(`Refresh token invalid/expired for photographer ${photographerId}. Requires re-authentication.`);
      }
      
      return false;
    }
  }

  /**
   * Create a calendar event for a specific photographer
   */
  async createEvent(photographerId: string, eventDetails: CalendarEventDetails): Promise<CalendarEventResult> {
    try {
      // Check if photographer has valid credentials
      const hasValidCredentials = await storage.hasValidGoogleCalendarCredentials(photographerId);
      
      if (!hasValidCredentials) {
        // Try to refresh tokens
        const refreshed = await this.refreshTokens(photographerId);
        if (!refreshed) {
          return {
            success: false,
            error: 'Google Calendar not connected or credentials expired. Please reconnect your calendar.'
          };
        }
      }

      const oauth2Client = this.createOAuth2Client();
      if (!oauth2Client) {
        return {
          success: false,
          error: 'Google Calendar not configured'
        };
      }
      
      const credentialsLoaded = await this.loadPhotographerCredentials(oauth2Client, photographerId);
      
      if (!credentialsLoaded) {
        return {
          success: false,
          error: 'Failed to load calendar credentials'
        };
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Generate a unique request ID for the conference
      const conferenceRequestId = `meet-${Date.now()}-${nanoid()}`;

      const event = {
        summary: eventDetails.summary,
        location: eventDetails.location || 'Google Meet',
        description: eventDetails.description || '',
        start: {
          dateTime: eventDetails.startTime.toISOString(),
          timeZone: eventDetails.timeZone || 'UTC',
        },
        end: {
          dateTime: eventDetails.endTime.toISOString(),
          timeZone: eventDetails.timeZone || 'UTC',
        },
        attendees: (eventDetails.attendeeEmails || []).map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 10 }, // 10 minutes before
          ],
        },
        // Auto-generate Google Meet link
        conferenceData: {
          createRequest: {
            requestId: conferenceRequestId,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1, // Required for Google Meet links
        sendUpdates: 'all' // Send invites to all attendees
      });

      // Extract the Google Meet link from the response
      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri;

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        googleMeetLink: meetLink
      };

    } catch (error: any) {
      console.error(`Error creating calendar event for photographer ${photographerId}:`, error);
      
      // Handle specific error cases
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        // Token is invalid, try to refresh
        const refreshed = await this.refreshTokens(photographerId);
        if (refreshed) {
          // Retry the creation
          return this.createEvent(photographerId, eventDetails);
        }
        
        return {
          success: false,
          error: 'Calendar authorization expired. Please reconnect your Google Calendar.'
        };
      }

      return {
        success: false,
        error: `Failed to create calendar event: ${error.message}`
      };
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(photographerId: string, eventId: string, eventDetails: Partial<CalendarEventDetails>): Promise<CalendarEventResult> {
    try {
      const oauth2Client = this.createOAuth2Client();
      if (!oauth2Client) {
        return {
          success: false,
          error: 'Google Calendar not configured'
        };
      }
      
      const credentialsLoaded = await this.loadPhotographerCredentials(oauth2Client, photographerId);
      
      if (!credentialsLoaded) {
        return {
          success: false,
          error: 'Calendar not connected'
        };
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // First, get the existing event
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      // Update only the provided fields
      const updatedEvent = {
        ...existingEvent.data,
        ...(eventDetails.summary && { summary: eventDetails.summary }),
        ...(eventDetails.description && { description: eventDetails.description }),
        ...(eventDetails.location && { location: eventDetails.location }),
        ...(eventDetails.startTime && {
          start: {
            dateTime: eventDetails.startTime.toISOString(),
            timeZone: eventDetails.timeZone || existingEvent.data.start?.timeZone || 'UTC'
          }
        }),
        ...(eventDetails.endTime && {
          end: {
            dateTime: eventDetails.endTime.toISOString(),
            timeZone: eventDetails.timeZone || existingEvent.data.end?.timeZone || 'UTC'
          }
        }),
        ...(eventDetails.attendeeEmails && {
          attendees: eventDetails.attendeeEmails.map(email => ({ email }))
        })
      };

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: 'all'
      });

      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri;

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        googleMeetLink: meetLink
      };

    } catch (error: any) {
      console.error(`Error updating calendar event for photographer ${photographerId}:`, error);
      return {
        success: false,
        error: `Failed to update calendar event: ${error.message}`
      };
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(photographerId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const oauth2Client = this.createOAuth2Client();
      if (!oauth2Client) {
        return {
          success: false,
          error: 'Google Calendar not configured'
        };
      }
      
      const credentialsLoaded = await this.loadPhotographerCredentials(oauth2Client, photographerId);
      
      if (!credentialsLoaded) {
        return {
          success: false,
          error: 'Calendar not connected'
        };
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });

      return { success: true };

    } catch (error: any) {
      console.error(`Error deleting calendar event for photographer ${photographerId}:`, error);
      return {
        success: false,
        error: `Failed to delete calendar event: ${error.message}`
      };
    }
  }

  /**
   * Check if Google Calendar is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Check if a photographer has valid calendar credentials
   */
  async isAuthenticated(photographerId: string): Promise<boolean> {
    return await storage.hasValidGoogleCalendarCredentials(photographerId);
  }

  /**
   * Disconnect calendar for a photographer
   */
  async disconnect(photographerId: string): Promise<void> {
    await storage.clearGoogleCalendarCredentials(photographerId);
  }
}

// Create and export a service instance (not singleton - this is just a class factory)
export const googleCalendarService = new GoogleCalendarService();

// Helper function to create a calendar event for a booking
export async function createBookingCalendarEvent(
  photographerId: string,
  bookingDetails: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    clientEmail?: string;
    clientName?: string;
    timeZone?: string;
  }
): Promise<CalendarEventResult> {
  const eventDetails: CalendarEventDetails = {
    summary: bookingDetails.title,
    description: bookingDetails.description,
    startTime: bookingDetails.startTime,
    endTime: bookingDetails.endTime,
    attendeeEmails: bookingDetails.clientEmail ? [bookingDetails.clientEmail] : [],
    timeZone: bookingDetails.timeZone || 'America/New_York',
    location: 'Google Meet'
  };

  return await googleCalendarService.createEvent(photographerId, eventDetails);
}