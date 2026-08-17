/**
 * Authentication & Authorization TypeScript Type Definitions
 * Comms Secure Messenger
 */

/**
 * Core User entity interface representing stored user document
 */
export interface User {
  userId: string;
  email: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date | null;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  bio?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  statusEmoji?: string;
}

/**
 * Public/Sanitized user representation (safe to send over API / WebSockets)
 */
export interface UserSanitized {
  userId: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date | null;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  bio?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  statusEmoji?: string;
}

/**
 * User active session representation
 */
export interface Session {
  sessionId: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Login attempt audit log interface for brute-force protection
 */
export interface LoginAttempt {
  attemptId: string;
  email: string;
  success: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Access & Refresh token pair response with expiration metadata
 */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds (e.g. 900 for 15 minutes)
  tokenType: 'Bearer';
}

/**
 * JWT Payload structure encoded in access / refresh tokens
 */
export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Registration API payload
 */
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  phoneNumber?: string;
}

/**
 * Login API payload
 */
export interface LoginRequest {
  email: string; // or username
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Refresh Token request payload
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Standard Auth Response returned on successful login or registration
 */
export interface AuthResponse {
  user: UserSanitized;
  tokens: AuthToken;
  session: {
    sessionId: string;
    expiresAt: Date;
  };
}

/**
 * Token Expiry & Security configuration constants
 */
export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ACCESS_TOKEN_EXPIRY_SECONDS: 15 * 60, // 900s
  REFRESH_TOKEN_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 604800s
  BCRYPT_SALT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME_MINUTES: 15,
} as const;
