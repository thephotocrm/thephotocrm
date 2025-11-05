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
 * Upload a file buffer to Cloudinary
 * @param fileBuffer - File buffer to upload
 * @param folder - Cloudinary folder path
 * @param options - Additional Cloudinary upload options
 * @returns Cloudinary upload result with URLs and metadata
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  options: Record<string, any> = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
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

/**
 * Apply watermark transformation to a Cloudinary image URL and sign it
 * @param imageUrl - Original Cloudinary image URL
 * @param watermarkOptions - Watermark configuration
 * @param signUrl - Whether to generate a signed URL (prevents transformation stripping)
 * @returns URL with watermark transformation applied (and optionally signed)
 */
export function applyWatermark(
  imageUrl: string,
  watermarkOptions: {
    watermarkImageUrl?: string;
    watermarkText?: string;
    position?: string;
    opacity?: number;
  },
  signUrl: boolean = false
): string {
  if (!imageUrl || (!watermarkOptions.watermarkImageUrl && !watermarkOptions.watermarkText)) {
    return imageUrl;
  }

  const { watermarkImageUrl, watermarkText, position = 'bottom-right', opacity = 60 } = watermarkOptions;

  // Map position to Cloudinary gravity
  const gravityMap: Record<string, string> = {
    'bottom-right': 'south_east',
    'bottom-left': 'south_west',
    'top-right': 'north_east',
    'top-left': 'north_west',
    'center': 'center',
  };

  const gravity = gravityMap[position] || 'south_east';
  
  // Build transformation string
  let transformation = '';
  
  if (watermarkImageUrl) {
    // Extract public ID from watermark image URL
    const watermarkPublicId = extractPublicIdFromUrl(watermarkImageUrl);
    if (watermarkPublicId) {
      // Image overlay transformation
      transformation = `l_${watermarkPublicId.replace(/\//g, ':')},g_${gravity},o_${opacity},w_150`;
    }
  } else if (watermarkText) {
    // Text overlay transformation
    const encodedText = encodeURIComponent(watermarkText).replace(/%20/g, '%2520');
    transformation = `l_text:Arial_40:${encodedText},g_${gravity},o_${opacity},co_rgb:FFFFFF`;
  }

  if (!transformation) {
    return imageUrl;
  }

  // If signing is required, use Cloudinary SDK to generate signed URL
  if (signUrl) {
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      // Generate signed URL that locks the transformation
      return cloudinary.url(publicId, {
        transformation: transformation,
        sign_url: true,
        type: 'upload'
      });
    }
  }

  // Otherwise, insert transformation into URL (not secure against URL manipulation)
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{ext}
  return imageUrl.replace('/upload/', `/upload/${transformation}/`);
}

/**
 * Extract Cloudinary public ID from a full URL
 * @param url - Cloudinary image URL
 * @returns Public ID without extension
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}
