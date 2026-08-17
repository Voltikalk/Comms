import jwt, { type SignOptions } from 'jsonwebtoken';
import { AUTH_CONSTANTS, type AuthToken, type JwtPayload } from '../types/auth.types';


const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'comms_jwt_access_secret_super_secure_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'comms_jwt_refresh_secret_super_secure_key_2026';

/**
 * Generate Access Token (Valid for 15 minutes)
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  const tokenPayload: JwtPayload = {
    ...payload,
    type: 'access',
  };

  const options: SignOptions = {
    expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
  };

  return jwt.sign(tokenPayload, JWT_ACCESS_SECRET, options);
}

/**
 * Generate Refresh Token (Valid for 7 days)
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  const tokenPayload: JwtPayload = {
    ...payload,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,
  };

  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, options);
}

/**
 * Generate a complete Token Pair (Access + Refresh) and session expiry date
 */
export function generateAuthTokenPair(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): {
  tokens: AuthToken;
  expiresAt: Date;
} {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: 'Bearer',
    },
    expiresAt,
  };
}

/**
 * Verify and decode an Access Token
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
}

/**
 * Verify and decode a Refresh Token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}
