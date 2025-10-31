import { db } from "../db";
import { photographers, projects } from "../../shared/schema";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";

// Google Drive API Configuration
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ShootProof API Configuration
const SHOOTPROOF_API_BASE = "https://api.shootproof.com/studio";
const SHOOTPROOF_TOKEN_URL = "https://auth.shootproof.com/oauth2/authorization/token";

export interface GalleryService {
  createGallery(projectId: string, photographerId: string): Promise<{ url: string; id: string }>;
  refreshGoogleDriveToken(photographerId: string): Promise<string>;
  refreshShootProofToken(photographerId: string): Promise<string>;
  syncShootProofGalleries(photographerId: string): Promise<{ matched: number; total: number }>;
}

class GalleryServiceImpl implements GalleryService {
  async createGallery(projectId: string, photographerId: string): Promise<{ url: string; id: string }> {
    const photographer = await db.query.photographers.findFirst({
      where: eq(photographers.id, photographerId),
    });

    if (!photographer) {
      throw new Error("Photographer not found");
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        client: true,
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (photographer.galleryPlatform === "GOOGLE_DRIVE") {
      return await this.createGoogleDriveFolder(photographer, project);
    } else if (photographer.galleryPlatform === "SHOOTPROOF") {
      return await this.createShootProofAlbum(photographer, project);
    } else {
      throw new Error("No gallery platform configured");
    }
  }

  private async createGoogleDriveFolder(photographer: any, project: any): Promise<{ url: string; id: string }> {
    // Ensure token is fresh
    const accessToken = await this.refreshGoogleDriveToken(photographer.id);

    // Create folder name
    const folderName = `${project.title} - ${project.client?.firstName} ${project.client?.lastName}`;

    // Create folder via Drive API
    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Google Drive folder: ${error}`);
    }

    const folder = await response.json();

    // Set folder permissions to "anyone with link can view" (read-only)
    const permissionsResponse = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${folder.id}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    });

    if (!permissionsResponse.ok) {
      const permError = await permissionsResponse.text();
      throw new Error(`Failed to set Google Drive folder permissions: ${permError}`);
    }

    const url = `https://drive.google.com/drive/folders/${folder.id}`;

    // Update project with gallery info
    await db
      .update(projects)
      .set({
        galleryUrl: url,
        galleryId: folder.id,
        galleryCreatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));

    return { url, id: folder.id };
  }

  private async createShootProofAlbum(photographer: any, project: any): Promise<{ url: string; id: string }> {
    // Ensure token is fresh
    const accessToken = await this.refreshShootProofToken(photographer.id);

    // Create event name
    const eventName = `${project.title} - ${project.client?.firstName || ""} ${project.client?.lastName || ""}`.trim();

    // Get studio information to find the default brand ID
    const studioResponse = await fetch(`${SHOOTPROOF_API_BASE}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.shootproof+json",
      },
    });

    if (!studioResponse.ok) {
      const error = await studioResponse.text();
      throw new Error(`Failed to get ShootProof studio info: ${error}`);
    }

    const studioData = await studioResponse.json();
    
    // Get the brand ID - usually studios have a default brand
    // The brand endpoint link is in the studio data
    const brandLink = studioData._links?.brand?.href;
    if (!brandLink) {
      throw new Error("No brand found for ShootProof studio. Please create a brand in ShootProof first.");
    }

    // Extract brand ID from the link (format: /studio/brand/{id})
    const brandIdMatch = brandLink.match(/\/brand\/([^/]+)/);
    if (!brandIdMatch) {
      throw new Error("Could not determine brand ID from ShootProof studio data.");
    }
    const brandId = brandIdMatch[1];

    // Create event via ShootProof Studio API
    const createResponse = await fetch(`${SHOOTPROOF_API_BASE}/brand/${brandId}/event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/vnd.shootproof+json",
        Accept: "application/vnd.shootproof+json",
      },
      body: JSON.stringify({
        name: eventName,
        // Add event date if available (ISO 8601 format)
        ...(project.eventDate && { eventDate: new Date(project.eventDate).toISOString() }),
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create ShootProof event: ${error}`);
    }

    const event = await createResponse.json();

    // Construct gallery URL from event data
    // ShootProof events have a 'url' field with the public gallery URL
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

  async refreshGoogleDriveToken(photographerId: string): Promise<string> {
    const photographer = await db.query.photographers.findFirst({
      where: eq(photographers.id, photographerId),
    });

    if (!photographer || !photographer.googleDriveRefreshToken) {
      throw new Error("Google Drive not connected");
    }

    // Check if token is still valid
    if (
      photographer.googleDriveAccessToken &&
      photographer.googleDriveTokenExpiry &&
      new Date(photographer.googleDriveTokenExpiry) > new Date()
    ) {
      return photographer.googleDriveAccessToken;
    }

    // Refresh token
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        refresh_token: photographer.googleDriveRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Google Drive token");
    }

    const data = await response.json();

    // Update stored tokens
    await db
      .update(photographers)
      .set({
        googleDriveAccessToken: data.access_token,
        googleDriveTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      })
      .where(eq(photographers.id, photographerId));

    return data.access_token;
  }

  async refreshShootProofToken(photographerId: string): Promise<string> {
    const photographer = await db.query.photographers.findFirst({
      where: eq(photographers.id, photographerId),
    });

    if (!photographer || !photographer.shootproofRefreshToken) {
      throw new Error("ShootProof not connected");
    }

    // Check if token is still valid (5 minute buffer)
    if (
      photographer.shootproofAccessToken &&
      photographer.shootproofTokenExpiry &&
      new Date(photographer.shootproofTokenExpiry).getTime() > Date.now() + 5 * 60 * 1000
    ) {
      return photographer.shootproofAccessToken;
    }

    // Refresh token using ShootProof OAuth 2.0 public client flow (no client secret needed)
    const response = await fetch(SHOOTPROOF_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.SHOOTPROOF_CLIENT_ID || "",
        refresh_token: photographer.shootproofRefreshToken,
        scope: "studio",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh ShootProof token: ${error}`);
    }

    const data = await response.json();

    // Update stored tokens (persist refresh_token if ShootProof rotates it)
    await db
      .update(photographers)
      .set({
        shootproofAccessToken: data.access_token,
        shootproofTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
        // Update refresh token if a new one is provided
        ...(data.refresh_token && { shootproofRefreshToken: data.refresh_token }),
      })
      .where(eq(photographers.id, photographerId));

    return data.access_token;
  }
}

export const galleryService = new GalleryServiceImpl();
