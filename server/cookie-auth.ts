import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// Cookie configuration
export const COOKIE_NAMES = {
  PHOTOGRAPHER: 'photographer_token',
  CLIENT: 'client_token',
  ADMIN: 'admin_token',
  LEGACY: 'token' // For backward compatibility
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'PHOTOGRAPHER' | 'CLIENT' | 'ADMIN';
  photographerId?: string;
}

// Set auth cookie based on role with optional domain for client portal subdomains
export function setAuthCookie(res: Response, token: string, role: string, req?: Request) {
  let cookieName: string;
  
  switch (role) {
    case 'PHOTOGRAPHER':
      cookieName = COOKIE_NAMES.PHOTOGRAPHER;
      break;
    case 'CLIENT':
      cookieName = COOKIE_NAMES.CLIENT;
      break;
    case 'ADMIN':
      cookieName = COOKIE_NAMES.ADMIN;
      break;
    default:
      cookieName = COOKIE_NAMES.LEGACY;
  }
  
  // Prepare cookie options for role-specific cookie
  let roleSpecificOptions = { ...COOKIE_OPTIONS };
  
  // For CLIENT cookies on portal subdomains, set domain to .tpcportal.co
  // This allows the cookie to work across all subdomains (*.tpcportal.co)
  if (role === 'CLIENT' && req) {
    const hostname = req.hostname || req.get('host')?.split(':')[0] || '';
    
    // Check if this is a tpcportal.co subdomain (e.g., abbiestreetphoto.tpcportal.co)
    if (hostname.endsWith('.tpcportal.co')) {
      roleSpecificOptions = {
        ...roleSpecificOptions,
        domain: '.tpcportal.co' // Leading dot allows cookie to work across all subdomains
      };
      console.log(`🍪 Setting CLIENT cookie with domain: .tpcportal.co for ${hostname}`);
    } else {
      console.log(`🍪 Setting CLIENT cookie without domain (host-only) for ${hostname}`);
    }
  }
  
  // Set the role-specific cookie
  res.cookie(cookieName, token, roleSpecificOptions);
  
  // Also set legacy token for backward compatibility (except for clients)
  // Use fresh copy of COOKIE_OPTIONS to prevent domain bleed from CLIENT cookies
  if (role !== 'CLIENT') {
    res.cookie(COOKIE_NAMES.LEGACY, token, { ...COOKIE_OPTIONS });
  }
}

// Get the highest precedence valid token from cookies
// Priority: ADMIN > PHOTOGRAPHER > CLIENT > LEGACY
export function getAuthToken(req: Request): { token: string; source: string } | null {
  const cookies = req.cookies || {};
  
  // Check cookies in priority order
  const checks = [
    { name: COOKIE_NAMES.ADMIN, source: 'admin' },
    { name: COOKIE_NAMES.PHOTOGRAPHER, source: 'photographer' },
    { name: COOKIE_NAMES.CLIENT, source: 'client' },
    { name: COOKIE_NAMES.LEGACY, source: 'legacy' }
  ];
  
  for (const { name, source } of checks) {
    const token = cookies[name];
    if (token) {
      try {
        // Verify the token is valid JWT
        jwt.verify(token, process.env.JWT_SECRET!);
        return { token, source };
      } catch (err) {
        // Invalid token, continue to next
        continue;
      }
    }
  }
  
  return null;
}

// Clear all auth cookies
export function clearAuthCookies(res: Response, req?: Request) {
  res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER);
  res.clearCookie(COOKIE_NAMES.ADMIN);
  res.clearCookie(COOKIE_NAMES.LEGACY);
  
  // Clear CLIENT cookie with domain if on portal subdomain
  if (req) {
    const hostname = req.hostname || req.get('host')?.split(':')[0] || '';
    if (hostname.endsWith('.tpcportal.co')) {
      res.clearCookie(COOKIE_NAMES.CLIENT, { domain: '.tpcportal.co' });
    } else {
      res.clearCookie(COOKIE_NAMES.CLIENT);
    }
  } else {
    // No request context, clear both host-only and domain versions
    res.clearCookie(COOKIE_NAMES.CLIENT);
    res.clearCookie(COOKIE_NAMES.CLIENT, { domain: '.tpcportal.co' });
  }
}

// Clear specific auth cookie
export function clearAuthCookie(res: Response, role: string, req?: Request) {
  switch (role) {
    case 'PHOTOGRAPHER':
      res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER);
      break;
    case 'CLIENT':
      // Clear CLIENT cookie with domain if on portal subdomain
      if (req) {
        const hostname = req.hostname || req.get('host')?.split(':')[0] || '';
        if (hostname.endsWith('.tpcportal.co')) {
          res.clearCookie(COOKIE_NAMES.CLIENT, { domain: '.tpcportal.co' });
        } else {
          res.clearCookie(COOKIE_NAMES.CLIENT);
        }
      } else {
        // No request context, clear both host-only and domain versions
        res.clearCookie(COOKIE_NAMES.CLIENT);
        res.clearCookie(COOKIE_NAMES.CLIENT, { domain: '.tpcportal.co' });
      }
      break;
    case 'ADMIN':
      res.clearCookie(COOKIE_NAMES.ADMIN);
      break;
  }
  // Always clear legacy token
  res.clearCookie(COOKIE_NAMES.LEGACY);
}
