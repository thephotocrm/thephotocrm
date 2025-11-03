import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  console.log('=== AUTHENTICATE TOKEN MIDDLEWARE ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Has cookies:', !!req.cookies);
  console.log('Has Authorization header:', !!req.headers.authorization);
  
  // Try to get token from cookie first
  let token = req.cookies?.token;
  
  // If no cookie, try Authorization header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('Token from Authorization header');
    }
  }
  
  console.log('Token exists:', !!token);

  if (!token) {
    console.log('No token found, returning 401');
    return res.status(401).json({ message: 'Access token required' });
  }

  const payload = verifyToken(token);
  console.log('Token payload:', !!payload);
  if (!payload) {
    console.log('Invalid token, returning 403');
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  console.log('Authentication successful, continuing to route');
  req.user = payload;
  next();
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

export function requirePhotographer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'PHOTOGRAPHER' || !req.user.photographerId) {
    return res.status(403).json({ message: 'Photographer access required' });
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check for the original admin role when impersonating
  if (req.user.originalRole === 'ADMIN' || req.user.role === 'ADMIN') {
    next();
    return;
  }

  return res.status(403).json({ message: 'Admin access required' });
}

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admins bypass subscription check
  if (req.user.role === 'ADMIN' || req.user.originalRole === 'ADMIN') {
    next();
    return;
  }

  // Only photographers need subscriptions
  if (req.user.role !== 'PHOTOGRAPHER' || !req.user.photographerId) {
    next();
    return;
  }

  try {
    const { storage } = await import('../storage');
    const photographer = await storage.getPhotographer(req.user.photographerId);

    if (!photographer) {
      return res.status(404).json({ message: 'Photographer not found' });
    }

    // Check subscription status
    const activeStatuses = ['trialing', 'active', 'unlimited'];
    if (!photographer.subscriptionStatus || !activeStatuses.includes(photographer.subscriptionStatus)) {
      return res.status(402).json({ 
        message: 'Active subscription required',
        subscriptionStatus: photographer.subscriptionStatus,
        trialEnded: photographer.trialEndsAt ? new Date(photographer.trialEndsAt) < new Date() : false
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function requireGalleryPlan(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admins bypass gallery plan check
  if (req.user.role === 'ADMIN' || req.user.originalRole === 'ADMIN') {
    next();
    return;
  }

  // Only photographers need gallery plans
  if (req.user.role !== 'PHOTOGRAPHER' || !req.user.photographerId) {
    next();
    return;
  }

  try {
    const { storage } = await import('../storage');
    const photographer = await storage.getPhotographer(req.user.photographerId);

    if (!photographer) {
      return res.status(404).json({ message: 'Photographer not found' });
    }

    // Check if photographer has a gallery plan
    if (!photographer.galleryPlanId) {
      return res.status(402).json({ 
        message: 'Gallery subscription required',
        galleryPlanRequired: true,
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Gallery plan check error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
