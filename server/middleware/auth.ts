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
  
  const token = req.cookies?.token;
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

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
}
