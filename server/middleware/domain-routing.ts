import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      domain?: {
        type: 'photographer' | 'client_portal' | 'dev';
        photographerSlug?: string;
        isCustomSubdomain?: boolean;
      };
    }
  }
}

// Domain configuration
const PHOTOGRAPHER_DOMAIN = 'thephotocrm.com';
const CLIENT_PORTAL_DOMAIN = 'tpcportal.co';
const DEV_DOMAIN_PATTERN = /\.replit\.dev$/;

/**
 * Middleware to detect which domain is being accessed and extract photographer subdomain if applicable
 */
export function detectDomain(req: Request, res: Response, next: NextFunction) {
  const hostname = req.hostname.toLowerCase();
  
  console.log('🌐 Domain detection:', hostname);
  
  // Check if it's a dev/replit domain
  if (DEV_DOMAIN_PATTERN.test(hostname)) {
    req.domain = {
      type: 'dev'
    };
    console.log('  → Development domain detected');
    next();
    return;
  }
  
  // Check if it's the photographer domain
  if (hostname === PHOTOGRAPHER_DOMAIN || hostname === `www.${PHOTOGRAPHER_DOMAIN}`) {
    req.domain = {
      type: 'photographer'
    };
    console.log('  → Photographer domain detected');
    next();
    return;
  }
  
  // Check if it's the client portal domain or a subdomain of it
  if (hostname.endsWith(CLIENT_PORTAL_DOMAIN)) {
    // Extract subdomain if present
    const parts = hostname.split('.');
    
    // If it's just tpcportal.co (no subdomain)
    if (hostname === CLIENT_PORTAL_DOMAIN) {
      req.domain = {
        type: 'client_portal',
        isCustomSubdomain: false
      };
      console.log('  → Client portal base domain detected (no photographer slug)');
      next();
      return;
    }
    
    // Extract photographer slug from subdomain (e.g., "johnsphotography.tpcportal.co")
    const photographerSlug = parts[0];
    
    req.domain = {
      type: 'client_portal',
      photographerSlug,
      isCustomSubdomain: true
    };
    console.log(`  → Client portal subdomain detected: ${photographerSlug}`);
    next();
    return;
  }
  
  // Unknown domain - default to dev for now
  req.domain = {
    type: 'dev'
  };
  console.log('  → Unknown domain, defaulting to dev mode');
  next();
}

/**
 * Middleware to load photographer info based on subdomain slug
 * Should be used after detectDomain and authenticateToken
 * 
 * IMPORTANT: Only applies photographer lookup to API routes.
 * Frontend routes (HTML/assets) pass through so React can load and handle errors in UI.
 */
export async function loadPhotographerFromSubdomain(req: Request, res: Response, next: NextFunction) {
  // Only apply to client portal subdomains
  if (req.domain?.type !== 'client_portal' || !req.domain.isCustomSubdomain || !req.domain.photographerSlug) {
    next();
    return;
  }
  
  // CRITICAL: Skip frontend routes - let Vite/React handle these
  // Only validate photographer for API requests
  if (!req.path.startsWith('/api/')) {
    console.log(`  → Skipping photographer lookup for frontend route: ${req.path}`);
    next();
    return;
  }
  
  try {
    const { storage } = await import('../storage');
    const slug = req.domain.photographerSlug;
    
    console.log(`🔍 Looking up photographer by slug: ${slug} for API route: ${req.path}`);
    
    // Find photographer by portal slug
    const photographer = await storage.getPhotographerByPortalSlug(slug);
    
    if (!photographer) {
      console.log(`❌ No photographer found for slug: ${slug}`);
      return res.status(404).json({ 
        message: 'Client portal not found',
        error: 'NO_PHOTOGRAPHER_FOR_SUBDOMAIN'
      });
    }
    
    console.log(`✅ Found photographer: ${photographer.businessName} (ID: ${photographer.id})`);
    
    // Attach photographer to request for downstream use
    // NOTE: Tenant authorization check happens in enforceSubdomainTenantAuth middleware
    // which runs AFTER authenticateToken, so req.user is available
    req.photographerFromSubdomain = photographer;
    
    next();
  } catch (error) {
    console.error('Error loading photographer from subdomain:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Middleware to enforce tenant authorization on client portal subdomains
 * MUST run AFTER authenticateToken so req.user is available
 * Use this on protected client portal routes
 */
export function enforceSubdomainTenantAuth(req: Request, res: Response, next: NextFunction) {
  // Only enforce on client portal subdomains with authenticated users
  if (!req.photographerFromSubdomain || !req.user) {
    next();
    return;
  }
  
  const subdomainPhotographerId = req.photographerFromSubdomain.id;
  
  // For photographer users, verify they own this photographer account
  if (req.user.role === 'PHOTOGRAPHER' && req.user.photographerId !== subdomainPhotographerId) {
    console.log(`❌ SECURITY: Photographer ${req.user.photographerId} trying to access ${subdomainPhotographerId}'s subdomain`);
    return res.status(403).json({ 
      message: 'Access denied - wrong photographer portal',
      error: 'CROSS_TENANT_ACCESS_DENIED'
    });
  }
  
  // For client users, verify they belong to this photographer
  if (req.user.role === 'CLIENT' && req.user.photographerId !== subdomainPhotographerId) {
    console.log(`❌ SECURITY: Client of photographer ${req.user.photographerId} trying to access ${subdomainPhotographerId}'s subdomain`);
    return res.status(403).json({ 
      message: 'Access denied - wrong client portal',
      error: 'CROSS_TENANT_ACCESS_DENIED'
    });
  }
  
  console.log(`✅ SECURITY: User ${req.user.email} authorized for photographer ${subdomainPhotographerId}`);
  next();
}

// Extend Request type with photographer
declare global {
  namespace Express {
    interface Request {
      photographerFromSubdomain?: any;
    }
  }
}
