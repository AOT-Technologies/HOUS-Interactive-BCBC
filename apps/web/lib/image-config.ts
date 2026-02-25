/**
 * Image Configuration
 * 
 * Handles image path resolution with configurable file extensions.
 * The image extension is set at build time via NEXT_PUBLIC_IMAGE_EXTENSION.
 * 
 * Default: .jpg
 * 
 * Usage:
 *   NEXT_PUBLIC_IMAGE_EXTENSION=.jpg npm run build
 *   NEXT_PUBLIC_IMAGE_EXTENSION=.png npm run build
 *   NEXT_PUBLIC_IMAGE_EXTENSION=.eps npm run build
 */

/**
 * Get the configured image extension from environment variable
 * Falls back to .jpg if not specified
 */
export const getImageExtension = (): string => {
  const extension = process.env.NEXT_PUBLIC_IMAGE_EXTENSION || '.jpg';
  
  // Ensure extension starts with a dot
  return extension.startsWith('.') ? extension : `.${extension}`;
};

/**
 * Convert image source path to full URL with proper extension
 * 
 * Handles:
 * - bc-graphics/ prefix removal
 * - Extension-less paths (adds configured extension)
 * - Legacy paths with .eps extension (replaces with configured extension)
 * - Absolute paths (returns as-is)
 * 
 * @param src - Image source path from JSON (e.g., "bc-graphics/figure-a-1-1-1-1-6-of-division-a")
 * @returns Full image path with extension (e.g., "/bc-graphics/figure-a-1-1-1-1-6-of-division-a.jpg")
 */
export const resolveImagePath = (src?: string): string | null => {
  if (!src || typeof src !== 'string') {
    return null;
  }

  const imageExtension = getImageExtension();

  // If src already starts with /, use it as-is
  if (src.startsWith('/')) {
    // Check if it already has an extension
    if (/\.(jpg|jpeg|png|gif|svg|eps|webp)$/i.test(src)) {
      return src;
    }
    // Add configured extension
    return `${src}${imageExtension}`;
  }

  // Normalize the path (remove leading slash if present)
  let normalizedSrc = src.replace(/^\//, '');

  // Remove legacy .eps extension if present
  normalizedSrc = normalizedSrc.replace(/\.eps$/i, '');

  // Remove other image extensions if present (shouldn't happen with new format)
  normalizedSrc = normalizedSrc.replace(/\.(jpg|jpeg|png|gif|svg|webp)$/i, '');

  // Add configured extension and return with leading slash
  return `/${normalizedSrc}${imageExtension}`;
};

/**
 * Get the public directory path for images
 * Used during build time for asset validation
 */
export const getPublicImagePath = (src?: string): string | null => {
  const imagePath = resolveImagePath(src);
  if (!imagePath) {
    return null;
  }
  
  // Remove leading slash for file system path
  return imagePath.replace(/^\//, '');
};
