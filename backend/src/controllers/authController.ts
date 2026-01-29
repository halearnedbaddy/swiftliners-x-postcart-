import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { otpService } from '../services/otpService';
import { jwtService } from '../services/jwtService';
import { normalizePhoneNumber, validatePhoneNumber } from '../middleware/security';
import { sendSMS } from '../services/smsService';
import { wsManager } from '../services/websocket';
import { getCountryFromIP } from '../services/geoService';
import bcrypt from 'bcryptjs';

/**
 * Request OTP for registration or login
 */
export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { phone, purpose } = req.body;

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        code: 'INVALID_PHONE',
      });
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    const validPurposes = ['LOGIN', 'REGISTRATION', 'PASSWORD_RESET', 'VERIFICATION'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP purpose',
        code: 'INVALID_PURPOSE',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (purpose === 'REGISTRATION' && existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already registered',
        code: 'PHONE_EXISTS',
      });
    }

    if (purpose === 'LOGIN' && !existingUser) {
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
      });
    }

    if (existingUser?.lockedUntil && new Date() < existingUser.lockedUntil) {
      const minutesRemaining = Math.ceil(
        (existingUser.lockedUntil.getTime() - Date.now()) / 1000 / 60
      );
      return res.status(403).json({
        success: false,
        error: `Account is locked. Try again in ${minutesRemaining} minutes`,
        code: 'ACCOUNT_LOCKED',
        lockedUntil: existingUser.lockedUntil,
      });
    }

    const otpResult = await otpService.generateOTP(normalizedPhone, purpose);

    if (!otpResult.success) {
      return res.status(429).json({
        success: false,
        error: otpResult.error,
        code: 'OTP_GENERATION_FAILED',
        waitTime: otpResult.waitTime,
      });
    }

    await sendSMS(
      normalizedPhone,
      `Your SWIFTLINE verification code is: ${otpResult.code}. Valid for 10 minutes. Do not share this code.`
    );

    prisma.auditLog.create({
      data: {
        userId: existingUser?.id,
        action: 'OTP_REQUESTED',
        entity: 'OTP',
        details: {
          phone: normalizedPhone,
          purpose,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    }).catch(err => console.error('Failed to log OTP request:', err));

    const response: any = {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: '10 minutes',
    };

    if (process.env.NODE_ENV === 'development') {
      response.otp = otpResult.code;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Register new user with Phone + OTP
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { phone, name, email, role, otp } = req.body;

    if (!phone || !name || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone, name, and OTP are required',
        code: 'MISSING_FIELDS',
      });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number',
        code: 'INVALID_PHONE',
      });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const countryCode = req.body.countryCode || await getCountryFromIP(req.ip || '127.0.0.1');
    const currencyCode = req.body.currencyCode || (countryCode === 'UG' ? 'UGX' : countryCode === 'TZ' ? 'TZS' : countryCode === 'RW' ? 'RWF' : 'KES');

    const validRoles = ['BUYER', 'SELLER'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already registered',
        code: 'PHONE_EXISTS',
      });
    }

    // CRITICAL: Verify OTP FIRST before any other operations
    const otpVerification = await otpService.verifyOTP(
      normalizedPhone,
      otp,
      'REGISTRATION'
    );

    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        error: otpVerification.error,
        code: 'OTP_VERIFICATION_FAILED',
      });
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: normalizedPhone,
          name,
          email: email || undefined,
          role: role || 'BUYER',
          signupMethod: 'PHONE_OTP',
          accountStatus: 'ACTIVE',
          isPhoneVerified: true,
          isVerified: true,
          isActive: true,
          countryCode,
          currencyCode,
        },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          role: true,
          signupMethod: true,
          memberSince: true,
          countryCode: true,
          currencyCode: true,
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });

      if (role === 'SELLER') {
        await tx.sellerProfile.create({
          data: {
            userId: newUser.id,
          },
        });
      }

      return newUser;
    });

    const deviceInfo = {
      deviceId: req.body.deviceId,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };

    const tokens = await jwtService.generateTokens(
      {
        userId: user.id,
        phone: user.phone || undefined,
        email: user.email || undefined,
        role: user.role,
      },
      deviceInfo
    );

    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entity: 'User',
        entityId: user.id,
        details: {
          role: user.role,
          signupMethod: 'PHONE_OTP',
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    }).catch(err => console.error('Failed to log registration:', err));

    wsManager.notifyAdmins({
      type: 'USER_REGISTERED',
      title: 'New User Registered',
      message: `${user.name} joined as a ${user.role.toLowerCase()} (Phone OTP)`,
      data: {
        type: 'USER_REGISTERED',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        signupMethod: 'PHONE_OTP',
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Register new user with Email + Password
 */
export const registerWithEmail = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
        code: 'MISSING_FIELDS',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD',
      });
    }

    const validRoles = ['BUYER', 'SELLER'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    }

    const countryCode = req.body.countryCode || await getCountryFromIP(req.ip || '127.0.0.1');
    const currencyCode = req.body.currencyCode || (countryCode === 'UG' ? 'UGX' : countryCode === 'TZ' ? 'TZS' : countryCode === 'RW' ? 'RWF' : 'KES');

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash,
          role: role || 'BUYER',
          signupMethod: 'EMAIL_PASSWORD',
          accountStatus: 'ACTIVE',
          isEmailVerified: false,
          isVerified: true,
          isActive: true,
          countryCode,
          currencyCode,
        },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          role: true,
          signupMethod: true,
          memberSince: true,
          countryCode: true,
          currencyCode: true,
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });

      if (role === 'SELLER') {
        await tx.sellerProfile.create({
          data: {
            userId: newUser.id,
          },
        });
      }

      return newUser;
    });

    const deviceInfo = {
      deviceId: req.body.deviceId,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };

    const tokens = await jwtService.generateTokens(
      {
        userId: user.id,
        phone: user.phone || undefined,
        email: user.email || undefined,
        role: user.role,
      },
      deviceInfo
    );

    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entity: 'User',
        entityId: user.id,
        details: {
          role: user.role,
          signupMethod: 'EMAIL_PASSWORD',
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    }).catch(err => console.error('Failed to log registration:', err));

    wsManager.notifyAdmins({
      type: 'USER_REGISTERED',
      title: 'New User Registered',
      message: `${user.name} joined as a ${user.role.toLowerCase()} (Email)`,
      data: {
        type: 'USER_REGISTERED',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        signupMethod: 'EMAIL_PASSWORD',
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Error registering user with email:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Login with Email + Password
 */
export const loginWithEmail = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_FIELDS',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
        accountStatus: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive || user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000 / 60
      );
      return res.status(403).json({
        success: false,
        error: `Account is locked. Try again in ${minutesRemaining} minutes`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      const newAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || '5');

      let lockedUntil: Date | null = null;
      if (newAttempts >= maxAttempts) {
        const lockoutMinutes = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || '30');
        lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    const deviceInfo = {
      deviceId: req.body.deviceId,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };

    const tokens = await jwtService.generateTokens(
      {
        userId: user.id,
        phone: user.phone || undefined,
        email: user.email || undefined,
        role: user.role,
      },
      deviceInfo
    );

    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        details: { method: 'EMAIL_PASSWORD' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    }).catch(err => console.error('Failed to log login:', err));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Error during email login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Admin Login - Email + Password ONLY
 */
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_FIELDS',
      });
    }

    const admin = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        role: 'ADMIN',
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
        accountStatus: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    if (!admin || !admin.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!admin.isActive || admin.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'Admin account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    if (admin.lockedUntil && new Date() < admin.lockedUntil) {
      const minutesRemaining = Math.ceil(
        (admin.lockedUntil.getTime() - Date.now()) / 1000 / 60
      );
      return res.status(403).json({
        success: false,
        error: `Account is locked. Try again in ${minutesRemaining} minutes`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

    if (!isValidPassword) {
      const newAttempts = admin.failedLoginAttempts + 1;
      const maxAttempts = 3;

      let lockedUntil: Date | null = null;
      if (newAttempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'ADMIN_LOGIN_FAILED',
          entity: 'User',
          entityId: admin.id,
          details: { attempts: newAttempts },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: false,
        },
      }).catch(err => console.error('Failed to log admin login attempt:', err));

      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    const deviceInfo = {
      deviceId: req.body.deviceId,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };

    const tokens = await jwtService.generateTokens(
      {
        userId: admin.id,
        phone: admin.phone || undefined,
        email: admin.email || undefined,
        role: admin.role,
      },
      deviceInfo
    );

    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'ADMIN_LOGIN',
        entity: 'User',
        entityId: admin.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    }).catch(err => console.error('Failed to log admin login:', err));

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          id: admin.id,
          phone: admin.phone,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Login user with Phone + OTP
 * FIXED: OTP verification happens immediately, user update in transaction for speed
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone and OTP are required',
        code: 'MISSING_FIELDS',
      });
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

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

    // CRITICAL: Verify OTP FIRST before any other operations
    const otpVerification = await otpService.verifyOTP(normalizedPhone, otp, 'LOGIN');

    if (!otpVerification.success) {
      const maxAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || '5');
      const newAttempts = user.failedLoginAttempts + 1;

      let lockedUntil: Date | null = null;
      if (newAttempts >= maxAttempts) {
        const lockoutMinutes = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || '30');
        lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            entity: 'User',
            entityId: user.id,
            details: {
              reason: 'Invalid OTP',
              attempts: newAttempts,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            success: false,
          },
        });
      });

      if (lockedUntil) {
        return res.status(403).json({
          success: false,
          error: 'Account locked due to multiple failed attempts',
          code: 'ACCOUNT_LOCKED',
          lockedUntil,
        });
      }

      return res.status(401).json({
        success: false,
        error: otpVerification.error,
        code: 'OTP_VERIFICATION_FAILED',
        remainingAttempts: maxAttempts - newAttempts,
      });
    }

    // OTP verified successfully
    const deviceInfo = {
      deviceId: req.body.deviceId,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };

    const tokens = await jwtService.generateTokens(
      {
        userId: user.id,
        phone: user.phone || '',
        email: user.email || undefined,
        role: user.role,
      },
      deviceInfo
    );

    // Update user and log in transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: true,
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_TOKEN',
      });
    }

    const newAccessToken = await jwtService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: newAccessToken,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        code: 'REFRESH_FAILED',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await jwtService.revokeRefreshToken(refreshToken);
    }

    if (req.user) {
      prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'USER_LOGOUT',
          entity: 'User',
          entityId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: true,
        },
      }).catch(err => console.error('Failed to log logout:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        profilePicture: true,
        isVerified: true,
        isActive: true,
        memberSince: true,
        lastLogin: true,
        wallet: {
          select: {
            availableBalance: true,
            pendingBalance: true,
            totalEarned: true,
            totalSpent: true,
          },
        },
        sellerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Get user sessions
 */
export const getSessions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    const sessions = await jwtService.getUserSessions(req.user.userId);

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    const { sessionId } = req.params;

    await jwtService.revokeSession(req.user.userId, sessionId);

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session',
      code: 'SERVER_ERROR',
    });
  }
};