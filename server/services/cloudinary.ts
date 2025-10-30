/**
 * Cloudinary image upload service for MMS messaging
 * Handles uploading compressed images to Cloudinary CDN
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
      resource_type: 'image',
      format: 'jpg', // Force JPEG format for consistency
      transformation: [
        { quality: 'auto' }, // Automatic quality optimization
        { fetch_format: 'auto' } // Auto format based on browser support
      ]
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
