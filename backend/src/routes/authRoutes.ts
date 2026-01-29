import { Router } from 'express';
import {
  requestOTP,
  register,
  registerWithEmail,
  login,
  loginWithEmail,
  adminLogin,
  refreshToken,
  logout,
  getProfile,
  getSessions,
  revokeSession,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authRateLimiter, otpRateLimiter, validateSchema, preventEnumeration } from '../middleware/security';

const router = Router();

/**
 * POST /api/v1/auth/otp/request
 * Request OTP for registration, login, or verification
 */
router.post(
  '/otp/request',
  otpRateLimiter,
  preventEnumeration,
  validateSchema({
    phone: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 15,
    },
    purpose: {
      required: true,
      type: 'string',
      validator: (value: string) => ['LOGIN', 'REGISTRATION', 'PASSWORD_RESET', 'VERIFICATION'].includes(value),
      validatorMessage: 'Purpose must be LOGIN, REGISTRATION, PASSWORD_RESET, or VERIFICATION',
    },
  }),
  requestOTP
);

/**
 * POST /api/v1/auth/register
 * Register a new user with Phone + OTP
 */
router.post(
  '/register',
  authRateLimiter,
  validateSchema({
    phone: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 15,
    },
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
    },
    email: {
      required: false,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    role: {
      required: false,
      type: 'string',
      validator: (value: string) => ['BUYER', 'SELLER'].includes(value),
      validatorMessage: 'Role must be BUYER or SELLER',
    },
    otp: {
      required: true,
      type: 'string',
      pattern: /^\d{6}$/,
      validatorMessage: 'OTP must be 6 digits',
    },
  }),
  register
);

/**
 * POST /api/v1/auth/register-email
 * Register a new user with Email + Password
 */
router.post(
  '/register-email',
  authRateLimiter,
  validateSchema({
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      validatorMessage: 'Valid email is required',
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      validatorMessage: 'Password must be at least 8 characters',
    },
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
    },
    role: {
      required: false,
      type: 'string',
      validator: (value: string) => ['BUYER', 'SELLER'].includes(value),
      validatorMessage: 'Role must be BUYER or SELLER',
    },
  }),
  registerWithEmail
);

/**
 * POST /api/v1/auth/login
 * Login with phone and OTP
 */
router.post(
  '/login',
  authRateLimiter,
  preventEnumeration,
  validateSchema({
    phone: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 15,
    },
    otp: {
      required: true,
      type: 'string',
      pattern: /^\d{6}$/,
      validatorMessage: 'OTP must be 6 digits',
    },
  }),
  login
);

/**
 * POST /api/v1/auth/login-email
 * Login with Email + Password
 */
router.post(
  '/login-email',
  authRateLimiter,
  preventEnumeration,
  validateSchema({
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      required: true,
      type: 'string',
      minLength: 1,
    },
  }),
  loginWithEmail
);

/**
 * POST /api/v1/auth/admin/login
 * Admin login - Email + Password ONLY
 * Admins cannot sign up - they are pre-created in the database
 */
router.post(
  '/admin/login',
  authRateLimiter,
  validateSchema({
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      required: true,
      type: 'string',
      minLength: 1,
    },
  }),
  adminLogin
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  validateSchema({
    refreshToken: {
      required: true,
      type: 'string',
    },
  }),
  refreshToken
);

/**
 * POST /api/v1/auth/logout
 * Logout and revoke refresh token
 */
router.post(
  '/logout',
  authenticate,
  logout
);

/**
 * GET /api/v1/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate, getProfile);

/**
 * GET /api/v1/auth/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', authenticate, getSessions);

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authenticate, revokeSession);

export default router;
