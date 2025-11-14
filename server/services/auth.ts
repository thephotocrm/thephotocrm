import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface JwtPayload {
  userId: string;
  role: string;
  photographerId?: string | null;
  isImpersonating?: boolean;
  adminUserId?: string;
  originalRole?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(email: string, password: string, options?: { role?: string; photographerId?: string }) {
  let user: any;
  
  // Role must always be provided to avoid ambiguous lookups
  if (!options?.role) {
    return null;
  }
  
  // For CLIENT logins, photographerId is required for tenant isolation
  if (options.role === 'CLIENT') {
    if (!options.photographerId) {
      console.error('CLIENT login attempted without photographerId - rejecting for security');
      return null;
    }
    user = await storage.getUserByEmailRolePhotographer(email, 'CLIENT', options.photographerId);
  } else if (options.role === 'PHOTOGRAPHER' || options.role === 'ADMIN') {
    // For PHOTOGRAPHER/ADMIN, use role-specific lookup to avoid cross-tenant access
    user = await storage.getUserByEmailAndRole(email, options.role);
  } else {
    // Unknown role
    return null;
  }
  
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
    photographerId: user.photographerId || undefined
  };

  const token = generateToken(payload);
  return { user, token };
}
