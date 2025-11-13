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

// Set auth cookie based on role
export function setAuthCookie(res: Response, token: string, role: string) {
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
  
  // Set the role-specific cookie
  res.cookie(cookieName, token, COOKIE_OPTIONS);
  
  // Also set legacy token for backward compatibility (except for clients)
  if (role !== 'CLIENT') {
    res.cookie(COOKIE_NAMES.LEGACY, token, COOKIE_OPTIONS);
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
export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER);
  res.clearCookie(COOKIE_NAMES.CLIENT);
  res.clearCookie(COOKIE_NAMES.ADMIN);
  res.clearCookie(COOKIE_NAMES.LEGACY);
}

// Clear specific auth cookie
export function clearAuthCookie(res: Response, role: string) {
  switch (role) {
    case 'PHOTOGRAPHER':
      res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER);
      break;
    case 'CLIENT':
      res.clearCookie(COOKIE_NAMES.CLIENT);
      break;
    case 'ADMIN':
      res.clearCookie(COOKIE_NAMES.ADMIN);
      break;
  }
  // Always clear legacy token
  res.clearCookie(COOKIE_NAMES.LEGACY);
}
