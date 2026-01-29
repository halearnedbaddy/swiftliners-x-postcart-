import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import crypto from 'crypto';

interface TokenPayload {
  userId: string;
  phone?: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  email?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

class JWTService {
  private readonly ACCESS_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
  private readonly REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(
    payload: TokenPayload,
    deviceInfo?: { deviceId?: string; userAgent?: string; ipAddress?: string }
  ): Promise<TokenPair> {
    // Generate access token (short-lived)
    const accessToken = jwt.sign({ ...payload } as any, this.ACCESS_SECRET, {
      expiresIn: this.ACCESS_EXPIRY,
      issuer: 'swiftline-api',
      audience: 'swiftline-client',
    } as any);

    // Generate refresh token (long-lived)
    const refreshTokenPayload = {
      userId: payload.userId,
      tokenId: crypto.randomUUID(),
    };

    const refreshToken = jwt.sign(refreshTokenPayload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRY,
      issuer: 'swiftline-api',
      audience: 'swiftline-client',
    } as any);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        token: refreshToken,
        deviceId: deviceInfo?.deviceId,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.ACCESS_EXPIRY,
      refreshTokenExpiresIn: this.REFRESH_EXPIRY,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.ACCESS_SECRET, {
        issuer: 'swiftline-api',
        audience: 'swiftline-client',
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string; tokenId: string }> {
    try {
      // Verify JWT signature
      const decoded = jwt.verify(token, this.REFRESH_SECRET, {
        issuer: 'swiftline-api',
        audience: 'swiftline-client',
      }) as { userId: string; tokenId: string };

      // Check if token exists and is not revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!storedToken) {
        throw new Error('Refresh token not found');
      }

      if (storedToken.isRevoked) {
        throw new Error('Refresh token has been revoked');
      }

      if (new Date() > storedToken.expiresAt) {
        throw new Error('Refresh token expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: string }> {
    try {
      const { userId } = await this.verifyRefreshToken(refreshToken);

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        this.ACCESS_SECRET,
        {
          expiresIn: this.ACCESS_EXPIRY,
          issuer: 'swiftline-api',
          audience: 'swiftline-client',
        } as any
      );

      return {
        accessToken,
        expiresIn: this.ACCESS_EXPIRY,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Clean up expired and revoked tokens
   */
  async cleanupTokens(): Promise<void> {
    const deleted = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isRevoked: true,
            revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
          },
        ],
      },
    });

    console.log(`🧹 Cleaned up ${deleted.count} expired/revoked tokens`);
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string) {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        deviceId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        id: sessionId,
        userId,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }
}

export const jwtService = new JWTService();
