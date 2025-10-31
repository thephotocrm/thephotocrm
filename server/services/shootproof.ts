import { db } from "../db";
import { photographers, projects } from "@shared/schema";
import { eq } from "drizzle-orm";

// ShootProof OAuth endpoints
const SHOOTPROOF_AUTH_URL = "https://auth.shootproof.com/oauth2/authorization/new";
const SHOOTPROOF_TOKEN_URL = "https://auth.shootproof.com/oauth2/authorization/token";
const SHOOTPROOF_API_BASE = "https://api.shootproof.com/v3";

interface ShootProofTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

interface ShootProofEventResponse {
  id: string;
  name: string;
  url: string;
}

export class ShootProofService {
  /**
   * Generate ShootProof OAuth authorization URL
   */
  generateAuthUrl(redirectUri: string, state: string): string {
    const clientId = process.env.SHOOTPROOF_CLIENT_ID;
    
    if (!clientId) {
      throw new Error("SHOOTPROOF_CLIENT_ID environment variable not configured");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "studio",
      state,
    });

    return `${SHOOTPROOF_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<ShootProofTokenResponse> {
    const clientId = process.env.SHOOTPROOF_CLIENT_ID;

    if (!clientId) {
      throw new Error("SHOOTPROOF_CLIENT_ID environment variable not configured");
    }

    const response = await fetch(SHOOTPROOF_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh ShootProof access token using refresh token
   */
  async refreshAccessToken(photographerId: string): Promise<string> {
    const photographer = await db.query.photographers.findFirst({
      where: eq(photographers.id, photographerId),
    });

    if (!photographer || !photographer.shootproofRefreshToken) {
      throw new Error("ShootProof not connected");
    }

    // Check if token is still valid (buffer of 5 minutes)
    if (
      photographer.shootproofAccessToken &&
      photographer.shootproofTokenExpiry &&
      new Date(photographer.shootproofTokenExpiry).getTime() > Date.now() + 5 * 60 * 1000
    ) {
      return photographer.shootproofAccessToken;
    }

    const clientId = process.env.SHOOTPROOF_CLIENT_ID;

    if (!clientId) {
      throw new Error("SHOOTPROOF_CLIENT_ID environment variable not configured");
    }

    // Refresh token
    const response = await fetch(SHOOTPROOF_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: photographer.shootproofRefreshToken,
        scope: "studio",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh ShootProof token: ${error}`);
    }

    const data: ShootProofTokenResponse = await response.json();

    // Update stored tokens
    await db
      .update(photographers)
      .set({
        shootproofAccessToken: data.access_token,
        shootproofTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      })
      .where(eq(photographers.id, photographerId));

    return data.access_token;
  }

  /**
   * Create a ShootProof event (album/gallery) for a project
   */
  async createEvent(
    photographerId: string,
    project: any
  ): Promise<{ url: string; id: string }> {
    // Ensure token is fresh
    const accessToken = await this.refreshAccessToken(photographerId);

    // Create event name
    const eventName = `${project.title} - ${project.client?.firstName || ""} ${project.client?.lastName || ""}`.trim();

    // Get service description to navigate API
    const serviceResponse = await fetch(`${SHOOTPROOF_API_BASE}/studio`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!serviceResponse.ok) {
      const error = await serviceResponse.text();
      throw new Error(`Failed to access ShootProof API: ${error}`);
    }

    const serviceData = await serviceResponse.json();
    
    // Find the events endpoint from the service description links
    const eventsEndpoint = serviceData._links?.events?.href || `${SHOOTPROOF_API_BASE}/studio/events`;

    // Create event via ShootProof API
    const createResponse = await fetch(eventsEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: eventName,
        // Add event date if available
        ...(project.eventDate && { event_date: project.eventDate }),
        // Add contact information if available
        ...(project.client?.email && {
          contact: {
            email: project.client.email,
            first_name: project.client.firstName,
            last_name: project.client.lastName,
          },
        }),
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create ShootProof event: ${error}`);
    }

    const event: ShootProofEventResponse = await createResponse.json();

    // Construct gallery URL (ShootProof event URL structure)
    const url = event.url || event._links?.self?.href || `https://www.shootproof.com/gallery/${event.id}`;

    // Update project with gallery info
    await db
      .update(projects)
      .set({
        galleryUrl: url,
        galleryId: event.id,
        galleryCreatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));

    return { url, id: event.id };
  }

  /**
   * Get photographer's ShootProof connection status
   */
  async getConnectionStatus(photographerId: string): Promise<{
    connected: boolean;
    email: string | null;
    connectedAt: Date | null;
  }> {
    const photographer = await db.query.photographers.findFirst({
      where: eq(photographers.id, photographerId),
    });

    if (!photographer) {
      throw new Error("Photographer not found");
    }

    return {
      connected: !!photographer.shootproofAccessToken,
      email: photographer.shootproofEmail,
      connectedAt: photographer.shootproofConnectedAt,
    };
  }

  /**
   * Disconnect ShootProof integration for a photographer
   */
  async disconnect(photographerId: string): Promise<void> {
    await db
      .update(photographers)
      .set({
        shootproofAccessToken: null,
        shootproofRefreshToken: null,
        shootproofTokenExpiry: null,
        shootproofConnectedAt: null,
        shootproofStudioId: null,
        shootproofEmail: null,
      })
      .where(eq(photographers.id, photographerId));
  }
}

export const shootProofService = new ShootProofService();
