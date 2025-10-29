/**
 * Image compression utilities for MMS messaging
 * Compresses images to fit within carrier limits (~500KB) while maintaining quality
 */

interface CompressionResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
}

const MAX_SIZE_KB = 500;
const MAX_DIMENSION = 1024;
const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5];

/**
 * Compresses an image file to be under 500KB for MMS delivery
 * Progressively reduces quality until target size is achieved
 */
export async function compressImageForMMS(file: File): Promise<CompressionResult> {
  try {
    const originalSize = file.size;

    // Load the image
    const image = await loadImage(file);
    
    // Calculate new dimensions while maintaining aspect ratio
    const { width, height } = calculateDimensions(image.width, image.height, MAX_DIMENSION);
    
    // Try progressive compression with different quality levels
    for (const quality of QUALITY_STEPS) {
      const dataUrl = await compressImage(image, width, height, quality);
      const compressedSize = estimateBase64Size(dataUrl);
      
      if (compressedSize <= MAX_SIZE_KB * 1024) {
        return {
          success: true,
          dataUrl,
          originalSize,
          compressedSize
        };
      }
    }
    
    // If we get here, even at lowest quality it's too big
    return {
      success: false,
      error: 'Image is too large to send via text message. Please choose a smaller image or use email instead.',
      originalSize
    };
    
  } catch (error) {
    console.error('Image compression error:', error);
    return {
      success: false,
      error: 'Failed to process image. Please try a different file.'
    };
  }
}

/**
 * Load image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number, 
  originalHeight: number, 
  maxDimension: number
): { width: number; height: number } {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  
  if (originalWidth > originalHeight) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio)
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension
    };
  }
}

/**
 * Compress image using canvas at specified quality
 */
function compressImage(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw image on canvas
    ctx.drawImage(image, 0, 0, width, height);
    
    // Convert to JPEG with specified quality
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    resolve(dataUrl);
  });
}

/**
 * Estimate the size of a base64 data URL in bytes
 * Base64 adds ~33% overhead, so we calculate based on the encoded string
 */
function estimateBase64Size(dataUrl: string): number {
  // Remove data URL prefix to get just the base64 string
  const base64String = dataUrl.split(',')[1] || dataUrl;
  
  // Each base64 character represents 6 bits
  // So length * 0.75 gives us approximate bytes
  return Math.ceil(base64String.length * 0.75);
}
