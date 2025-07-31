/**
 * Mobile-optimized image compression utilities
 * Reduces image size and quality for better mobile upload performance
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
}

/**
 * Default compression settings optimized for mobile profiles
 */
const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.8,
  maxSizeKB: 200, // 200KB max for mobile
  format: 'webp', // Best compression for modern browsers
};

/**
 * Compress an image file for mobile upload
 */
export async function compressImageForMobile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = async () => {
      try {
        // Calculate optimal dimensions
        const { width: newWidth, height: newHeight } = calculateOptimalDimensions(
          img.width,
          img.height,
          opts.maxWidth,
          opts.maxHeight
        );
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and compress image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Try different quality settings to meet size requirements
        let quality = opts.quality;
        let compressedFile: File;
        
        do {
          const blob = await canvasToBlob(canvas, opts.format, quality);
          compressedFile = new File([blob], file.name, {
            type: `image/${opts.format}`,
            lastModified: Date.now(),
          });
          
          // If size is acceptable or quality is already very low, break
          if (compressedFile.size <= opts.maxSizeKB * 1024 || quality <= 0.3) {
            break;
          }
          
          // Reduce quality for next iteration
          quality -= 0.1;
        } while (quality > 0.3);
        
        const compressionRatio = (1 - compressedFile.size / file.size) * 100;
        
        resolve({
          file: compressedFile,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          compressionRatio,
          dimensions: { width: newWidth, height: newHeight },
        });
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };
  
  // Calculate scale factor
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scaleFactor = Math.min(widthRatio, heightRatio, 1); // Don't upscale
  
  width = Math.round(width * scaleFactor);
  height = Math.round(height * scaleFactor);
  
  return { width, height };
}

/**
 * Convert canvas to blob with proper error handling
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Check if the browser supports WebP format
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal image format for the current browser
 */
export function getOptimalImageFormat(): 'webp' | 'jpeg' {
  return supportsWebP() ? 'webp' : 'jpeg';
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
    };
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB original file limit
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    };
  }
  
  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}