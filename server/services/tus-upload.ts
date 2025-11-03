import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import path from "path";
import fs from "fs/promises";
import { uploadToCloudinary } from "./cloudinary";

// TUS server configuration for resumable uploads
const tusDataDir = path.join(process.cwd(), "tus-uploads");

// In-memory cache for Cloudinary upload results
// Key: TUS upload ID, Value: Cloudinary data
export const cloudinaryCache = new Map<string, any>();

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(tusDataDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create TUS upload directory:", error);
  }
}

ensureUploadDir();

// Create TUS server instance
export const tusServer = new Server({
  path: "/api/galleries",
  datastore: new FileStore({ directory: tusDataDir }),
  // Limit upload size to 100MB per file
  maxSize: 100 * 1024 * 1024,
  // Allow requests from our domain
  allowedHeaders: ["Authorization", "Content-Type", "Upload-Offset", "Upload-Length", "Upload-Metadata", "Tus-Resumable"],
  // Respect CORS
  respectForwardedHeaders: true,
  // Callbacks for upload lifecycle
  async onUploadCreate(req, res, upload) {
    console.log("[TUS] Upload created:", upload.id);
    
    // Extract metadata from upload
    const metadata = upload.metadata || {};
    console.log("[TUS] Upload metadata:", metadata);
    
    return res;
  },
  async onUploadFinish(req, res, upload) {
    console.log("[TUS] Upload finished:", upload.id);
    
    try {
      // Get the uploaded file path
      const filePath = path.join(tusDataDir, upload.id);
      
      // Extract metadata
      const metadata = upload.metadata || {};
      const galleryId = metadata.galleryId as string;
      const photographerId = metadata.photographerId as string;
      const filename = (metadata.filename as string) || "upload.jpg";
      const filetype = (metadata.filetype as string) || "image/jpeg";
      
      console.log("[TUS] Processing upload:", {
        galleryId,
        photographerId,
        filename,
        filetype,
        fileSize: upload.size
      });
      
      // Read the file
      const fileBuffer = await fs.readFile(filePath);
      
      // Upload to Cloudinary
      const cloudinaryFolder = `galleries/${galleryId}`;
      const cloudinaryResult = await uploadToCloudinary(
        fileBuffer,
        cloudinaryFolder,
        {
          resource_type: "auto",
          folder: cloudinaryFolder,
          transformation: [
            { quality: "auto", fetch_format: "auto" }
          ]
        }
      );
      
      console.log("[TUS] Cloudinary upload successful:", cloudinaryResult.public_id);
      
      // Store Cloudinary result in cache for retrieval by finalize endpoint
      const cloudinaryData = {
        galleryId,
        photographerId,
        originalUrl: cloudinaryResult.secure_url,
        webUrl: cloudinaryResult.secure_url.replace("/upload/", "/upload/w_1920,q_auto,f_auto/"),
        thumbnailUrl: cloudinaryResult.secure_url.replace("/upload/", "/upload/w_400,h_400,c_fill,q_auto,f_auto/"),
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryFolder,
        format: cloudinaryResult.format,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        fileSize: cloudinaryResult.bytes,
        filename
      };
      
      // Cache the data with the upload ID
      cloudinaryCache.set(upload.id, cloudinaryData);
      
      // Set expiry - clear cache after 1 hour
      setTimeout(() => {
        cloudinaryCache.delete(upload.id);
        console.log("[TUS] Cleared cache for upload:", upload.id);
      }, 60 * 60 * 1000);
      
      // Clean up the local file
      await fs.unlink(filePath).catch(err => 
        console.error("[TUS] Failed to delete temp file:", err)
      );
      
      console.log("[TUS] Upload processing complete, data cached");
    } catch (error) {
      console.error("[TUS] Failed to process upload:", error);
      // Continue - TUS upload was successful even if post-processing failed
    }
    
    return res;
  }
});
