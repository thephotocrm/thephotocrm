/**
 * Cloudinary image upload service for MMS messaging
 * Handles uploading compressed images to Cloudinary CDN
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

console.log('🔐 Cloudinary config check:', {
  hasCloudName: !!cloudName,
  hasApiKey: !!apiKey,
  hasApiSecret: !!apiSecret,
  cloudName: cloudName || 'MISSING'
});

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

/**
 * Upload a base64 image to Cloudinary
 * @param base64Image - Base64 encoded image (including data:image/jpeg;base64, prefix)
 * @param folder - Optional folder name in Cloudinary (default: 'mms')
 * @returns Public HTTPS URL of the uploaded image
 */
export async function uploadImageToCloudinary(
  base64Image: string,
  folder: string = 'mms'
): Promise<string> {
  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Image, {
      folder,
      resource_type: 'image'
    });

    // Return the secure URL
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to cloud storage');
  }
}

/**
 * Delete an image from Cloudinary by URL
 * @param imageUrl - The Cloudinary URL to delete
 */
export async function deleteImageFromCloudinary(imageUrl: string): Promise<void> {
  try {
    // Extract public ID from URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.jpg
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `mms/${filename.replace(/\.[^/.]+$/, '')}`; // Remove extension

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Don't throw - deletion failures shouldn't break the flow
  }
}

/**
 * Check if Cloudinary is properly configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
