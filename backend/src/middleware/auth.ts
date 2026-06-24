import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { GymOwner, SuperAdmin } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-india-gym-saas-2026';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'super_admin' | 'gym_owner';
        gymName?: string;
      };
    }
  }
}

export type AuthenticatedRequest = Request;

// Global Authentication Middleware
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: Authentication token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;

    // Check if the user is still active/valid in DB
    if (decoded.role === 'gym_owner') {
      const owner = await GymOwner.findById(decoded.id);
      if (!owner || owner.isDeleted) {
        return res.status(401).json({ message: 'User profile not found or deactivated.' });
      }
      
      // Auto Expiry Checking and Block
      const now = new Date();
      if (new Date(owner.subscription.expiryDate) < now && owner.subscription.status === 'active') {
        // Update subscription state in DB dynamically
        owner.subscription.status = 'expired';
        await owner.save();
      }

      if (owner.subscription.status === 'expired' || owner.subscription.status === 'suspended' || owner.status === 'suspended') {
        // Allow all GET requests (read-only mode), but block POST, PUT, DELETE for non-bypass routes
        const isBypassRoute = req.path.startsWith('/auth') || req.path.includes('/subscription') || req.path.includes('/billing');
        if (!isBypassRoute && req.method !== 'GET') {
          return res.status(403).json({
            message: `Your gym workspace subscription is ${owner.subscription.status.toUpperCase()}. Access blocked for modifying operations. Please contact the platform Super Admin on WhatsApp to renew or reactivate.`,
            status: owner.status === 'suspended' ? 'suspended' : owner.subscription.status,
            whatsAppRedirect: true
          });
        }
      }
    } else if (decoded.role === 'super_admin') {
      const admin = await SuperAdmin.findById(decoded.id);
      if (!admin) {
        return res.status(401).json({ message: 'Administrator profile not found.' });
      }
    }

    next();
  } catch (err) {
    return res.status(403).json({ message: 'Access Denied: Invalid or expired token.' });
  }
}

// Role Authorization Middleware
export function authorizeRoles(roles: ('super_admin' | 'gym_owner')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access Forbidden: Insufficient administrative privileges.' });
    }
    next();
  };
}
