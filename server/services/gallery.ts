import { db } from "../db";
import { photographers, projects } from "../../shared/schema";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";

// Google Drive API Configuration
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ShootProof API Configuration
const SHOOTPROOF_API_BASE = "https://api.shootproof.com/v2";
const SHOOTPROOF_OAUTH_BASE = "https://api.shootproof.com/oauth";

export interface GalleryService {
  createGallery(projectId: string, photographerId: string): Promise<{ url: string; id: string }>;
  refreshGoogleDriveToken(photographerId: string): Promise<string>;
  refreshShootProofToken(photographerId: string): Promise<string>;
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

    // Create event first (ShootProof requires events to contain albums)
    const eventName = `${project.title} - ${project.client?.firstName} ${project.client?.lastName}`;

    const eventResponse = await fetch(`${SHOOTPROOF_API_BASE}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: eventName,
        event_date: project.eventDate || new Date().toISOString(),
      }),
    });

    if (!eventResponse.ok) {
      const error = await eventResponse.text();
      throw new Error(`Failed to create ShootProof event: ${error}`);
    }

    const event = await eventResponse.json();
    const eventId = event.id;

    // Create album within the event
    const albumResponse = await fetch(`${SHOOTPROOF_API_BASE}/events/${eventId}/albums`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Gallery",
      }),
    });

    if (!albumResponse.ok) {
      const error = await albumResponse.text();
      throw new Error(`Failed to create ShootProof album: ${error}`);
    }

    const album = await albumResponse.json();
    
    // Verify the album has a public URL
    if (!album.public_url) {
      throw new Error(
        "ShootProof album created but is not publicly accessible. " +
        "Please publish the album in ShootProof before sharing with clients."
      );
    }
    
    const url = album.public_url;

    // Update project with gallery info
    await db
      .update(projects)
      .set({
        galleryUrl: url,
        galleryId: album.id,
        galleryCreatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));

    return { url, id: album.id };
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

    // Check if token is still valid
    if (
      photographer.shootproofAccessToken &&
      photographer.shootproofTokenExpiry &&
      new Date(photographer.shootproofTokenExpiry) > new Date()
    ) {
      return photographer.shootproofAccessToken;
    }

    // Refresh token
    const response = await fetch(`${SHOOTPROOF_OAUTH_BASE}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.SHOOTPROOF_CLIENT_ID || "",
        client_secret: process.env.SHOOTPROOF_CLIENT_SECRET || "",
        refresh_token: photographer.shootproofRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh ShootProof token");
    }

    const data = await response.json();

    // Update stored tokens
    await db
      .update(photographers)
      .set({
        shootproofAccessToken: data.access_token,
        shootproofRefreshToken: data.refresh_token,
        shootproofTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      })
      .where(eq(photographers.id, photographerId));

    return data.access_token;
  }
}

export const galleryService = new GalleryServiceImpl();
