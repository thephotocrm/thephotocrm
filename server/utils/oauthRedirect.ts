/**
 * Shared OAuth Redirect URI Resolver
 * 
 * Provides consistent redirect URI detection across Railway, Replit, and local environments
 * for all Google OAuth flows (Calendar, Gmail, Sign in with Google).
 * 
 * Precedence order:
 * 1. Explicit GOOGLE_REDIRECT_URI environment variable (highest priority)
 * 2. Railway production domain (RAILWAY_PUBLIC_DOMAIN)
 * 3. Replit development domain (REPLIT_DEV_DOMAIN)
 * 4. Replit production domain (REPLIT_DOMAINS)
 * 5. Replit legacy format (REPL_SLUG + REPL_OWNER)
 * 6. Localhost fallback for local development
 */

/**
 * Get the appropriate OAuth redirect URI for Google OAuth flows
 * 
 * @param callbackPath - The callback path (e.g., "/api/auth/google-calendar/callback")
 * @returns The full redirect URI (e.g., "https://domain.com/api/auth/google-calendar/callback")
 */
export function getGoogleRedirectUri(callbackPath: string): string {
  // Remove leading slash if present to ensure consistent concatenation
  const path = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`;
  
  // 1. Explicit override - highest priority
  // If GOOGLE_REDIRECT_URI is set, check if it matches the requested callback path
  if (process.env.GOOGLE_REDIRECT_URI) {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    try {
      // Parse the URL to extract domain and path
      const url = new URL(redirectUri);
      
      // If the override's path matches the requested callback path, use it exactly
      // Example: GOOGLE_REDIRECT_URI=https://domain.com/api/auth/google/callback
      //          matches when callbackPath is /api/auth/google/callback
      if (url.pathname === path) {
        return redirectUri;
      }
      
      // If paths don't match, extract the base domain and append the requested callback path
      // This allows GOOGLE_REDIRECT_URI to serve as a base domain override
      // Example: GOOGLE_REDIRECT_URI=https://custom-domain.com/api/auth/google/callback
      //          becomes https://custom-domain.com/api/auth/google-calendar/callback
      //          when calendar flow requests it
      const baseDomain = `${url.protocol}//${url.host}`;
      return `${baseDomain}${path}`;
    } catch (error) {
      // If URL parsing fails, treat it as invalid and fall through to auto-detection
      console.warn(`Invalid GOOGLE_REDIRECT_URI format: ${redirectUri}. Falling back to auto-detection.`);
    }
  }
  
  // 2. Railway deployment (production)
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}${path}`;
  }
  
  // 3. Replit dev environment (development)
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}${path}`;
  }
  
  // 4. Replit production domain
  if (process.env.REPLIT_DOMAINS) {
    // Use the first domain from REPLIT_DOMAINS (this is the actual current domain)
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return `https://${domains[0]}${path}`;
  }
  
  // 5. Replit legacy format (fallback)
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co${path}`;
  }
  
  // 6. Localhost for local development
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://localhost:5000${path}`;
}

/**
 * Get the base domain for the current environment
 * Useful for constructing URLs and logging
 */
export function getBaseDomain(): string {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return process.env.RAILWAY_PUBLIC_DOMAIN;
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    return process.env.REPLIT_DEV_DOMAIN;
  }
  
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return domains[0];
  }
  
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co`;
  }
  
  return 'localhost:5000';
}

/**
 * Get the environment type for logging and debugging
 */
export function getEnvironmentType(): 'railway' | 'replit-dev' | 'replit-prod' | 'local' {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return 'railway';
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    return 'replit-dev';
  }
  
  if (process.env.REPLIT_DOMAINS || (process.env.REPL_SLUG && process.env.REPL_OWNER)) {
    return 'replit-prod';
  }
  
  return 'local';
}

/**
 * Get the photographer CRM app domain URL
 * In production (Railway): https://app.thephotocrm.com
 * In development: uses current dev domain
 */
export function getPhotographerAppUrl(): string {
  // Production on Railway: always use app.thephotocrm.com
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return 'https://app.thephotocrm.com';
  }
  
  // Replit development: use current dev domain (already on correct domain during dev)
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Replit production: use current production domain
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return `https://${domains[0]}`;
  }
  
  // Replit legacy format
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co`;
  }
  
  // Local development
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://localhost:5000`;
}
