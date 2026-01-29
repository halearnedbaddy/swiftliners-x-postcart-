import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwtService';
import { prisma } from '../config/database';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phone: string;
        email?: string;
        role: 'BUYER' | 'SELLER' | 'ADMIN';
      };
    }
  }
}

/**
 * Authenticate user from JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = jwtService.verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000 / 60
      );
      return res.status(403).json({
        success: false,
        error: `Account is locked. Try again in ${minutesRemaining} minutes`,
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil,
      });
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      phone: user.phone || '',
      email: user.email || undefined,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access token expired') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      if (error.message === 'Invalid access token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
      }
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: Array<'BUYER' | 'SELLER' | 'ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: roles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Require verified account
 */
export const requireVerified = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { isVerified: true },
  });

  if (!user?.isVerified) {
    return res.status(403).json({
      success: false,
      error: 'Account verification required',
      code: 'NOT_VERIFIED',
    });
  }

  next();
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = {
        userId: user.id,
        phone: user.phone || '',
        email: user.email || undefined,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // Fail silently for optional auth
    next();
  }
};

/**
 * Check if user owns the resource
 */
export const requireOwnership = (resourceUserIdParam: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    const resourceUserId = req.params[resourceUserIdParam];

    // Admins can access any resource
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // User must own the resource
    if (req.user.userId !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

/**
 * Middleware to log authentication attempts
 */
export const logAuth = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function (data: any): Response {
    // Log authentication attempt after response
    if (req.user) {
      prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'API_REQUEST',
          entity: 'Request',
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: res.statusCode < 400,
        },
      }).catch(err => console.error('Failed to log auth:', err));
    }
    
    return originalSend.call(this, data);
  };

  next();
};
