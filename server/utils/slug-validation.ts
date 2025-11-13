/**
 * Slug validation and generation utilities
 */

// Reserved slug names that cannot be used
const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp',
  'portal', 'client', 'dashboard', 'login', 'signup',
  'help', 'support', 'docs', 'blog', 'status'
];

/**
 * Validates that a portal slug meets all requirements
 * Rules:
 * - Only lowercase letters, numbers, and hyphens
 * - 3-63 characters long
 * - Cannot start or end with hyphen
 * - Cannot be a reserved word
 */
export function validatePortalSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim() === '') {
    return { valid: false, error: 'Slug cannot be empty' };
  }
  
  const normalized = slug.toLowerCase().trim();
  
  // Check length
  if (normalized.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters long' };
  }
  
  if (normalized.length > 63) {
    return { valid: false, error: 'Slug must be 63 characters or less' };
  }
  
  // Check format (only a-z, 0-9, and hyphens)
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  
  // Cannot start or end with hyphen
  if (normalized.startsWith('-') || normalized.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' };
  }
  
  // Check for reserved words
  if (RESERVED_SLUGS.includes(normalized)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' };
  }
  
  return { valid: true };
}

/**
 * Generates a URL-safe slug from a business name
 * Example: "John's Photography" -> "johns-photography"
 */
export function generateSlugFromBusinessName(businessName: string): string {
  return businessName
    .toLowerCase()
    .trim()
    // Replace apostrophes and other punctuation with nothing
    .replace(/['']/g, '')
    // Replace spaces and other non-alphanumeric chars with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit to 63 characters
    .substring(0, 63);
}

/**
 * Normalizes a slug to lowercase for consistent lookups
 */
export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}
