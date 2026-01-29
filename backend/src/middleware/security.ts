import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'crypto';

/**
 * Global rate limiter - applies to all routes
 */
export const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain IPs (e.g., internal services)
  skip: (req) => {
    const whitelist = (process.env.RATE_LIMIT_WHITELIST || '').split(',');
    return whitelist.includes(req.ip || '');
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Strict rate limiter for OTP endpoints
 */
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 OTP requests per window
  message: {
    success: false,
    error: 'Too many OTP requests, please try again later',
    code: 'OTP_RATE_LIMIT',
  },
  keyGenerator: (req) => {
    // Rate limit by phone number if provided, otherwise use IP helper for IPv6 support
    const phone = (req.body as any)?.phone;
    return phone || ipKeyGenerator(req as any);
  },
});

/**
 * Rate limiter for payment/withdrawal endpoints
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 payment requests per minute
  message: {
    success: false,
    error: 'Too many payment requests, please try again later',
    code: 'PAYMENT_RATE_LIMIT',
  },
});

/**
 * Helmet security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * CSRF Protection middleware
 */
class CSRFProtection {
  private tokens = new Map<string, { token: string; expiresAt: number }>();
  private readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(sessionId, {
      token,
      expiresAt: Date.now() + this.TOKEN_EXPIRY,
    });

    // Clean up expired tokens
    this.cleanup();

    return token;
  }

  validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }

  private cleanup() {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

export const csrfProtection = new CSRFProtection();

/**
 * CSRF validation middleware
 */
export const validateCSRF = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionId = (req as any).sessionID || req.user?.userId || req.ip || 'anonymous';

  if (!token || !csrfProtection.validateToken(sessionId, token)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or missing CSRF token',
      code: 'CSRF_INVALID',
    });
  }

  next();
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query params
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a string (prevent XSS, SQL injection)
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers
    .trim();
}

/**
 * Phone number validation
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Kenyan phone number format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
  const kenyaRegex = /^(\+?254|0)(7|1)\d{8}$/;
  return kenyaRegex.test(phone);
};

/**
 * Normalize phone number to E.164 format
 */
export const normalizePhoneNumber = (phone: string): string => {
  // Remove spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '');

  // Convert to +254 format
  if (normalized.startsWith('0')) {
    normalized = '+254' + normalized.substring(1);
  } else if (normalized.startsWith('254')) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+')) {
    normalized = '+254' + normalized;
  }

  return normalized;
};

/**
 * Validate email
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Middleware to validate request body schema
 */
export const validateSchema = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      const fieldRules = rules as any;

      // Required check
      if (fieldRules.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if field is not required and not provided
      if (!value && !fieldRules.required) {
        continue;
      }

      // Type check
      if (fieldRules.type && typeof value !== fieldRules.type) {
        errors.push(`${field} must be a ${fieldRules.type}`);
      }

      // Min length
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        errors.push(`${field} must be at least ${fieldRules.minLength} characters`);
      }

      // Max length
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        errors.push(`${field} must not exceed ${fieldRules.maxLength} characters`);
      }

      // Pattern match
      if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }

      // Custom validator
      if (fieldRules.validator && !fieldRules.validator(value)) {
        errors.push(fieldRules.validatorMessage || `${field} is invalid`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
        code: 'VALIDATION_ERROR',
      });
    }

    next();
  };
};

/**
 * Prevent account enumeration
 */
export const preventEnumeration = (req: Request, res: Response, next: NextFunction) => {
  // Add a random delay (100-300ms) to prevent timing attacks
  const delay = Math.floor(Math.random() * 200) + 100;
  setTimeout(next, delay);
};

/**
 * Detect and block suspicious activity
 */
export const detectSuspiciousActivity = async (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/proc\/|\.\.\/)/i, // Path traversal
    /(union.*select|select.*from|insert.*into|delete.*from)/i, // SQL injection
    /(<script|javascript:|onerror=|onload=)/i, // XSS
    /(eval\(|exec\(|system\()/i, // Code injection
  ];

  const checkString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.warn('🚨 Suspicious activity detected:', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
      });

      return res.status(403).json({
        success: false,
        error: 'Suspicious activity detected',
        code: 'SUSPICIOUS_ACTIVITY',
      });
    }
  }

  next();
};

/**
 * Log security events
 */
export const logSecurityEvent = (
  event: string,
  details: any,
  req: Request
) => {
  console.log('🔒 Security Event:', {
    event,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
    ...details,
  });
};
