import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Session } from '../types/auth.types';


/**
 * Interface representing Session document in MongoDB
 */
export interface ISessionDocument extends Document, Omit<Session, 'sessionId'> {
  sessionId: string;
  isExpired(): boolean;
}

/**
 * Interface for Session Model with static methods
 */
export interface ISessionModel extends Model<ISessionDocument> {
  createSession(data: {
    userId: string;
    token: string;
    refreshToken: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<ISessionDocument>;
  findValidSession(refreshToken: string): Promise<ISessionDocument | null>;
  revokeSession(sessionId: string): Promise<boolean>;
  revokeAllUserSessions(userId: string): Promise<number>;
}

const SessionSchema = new Schema<ISessionDocument, ISessionModel>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => 'sess_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Access token is required'],
    },
    refreshToken: {
      type: String,
      required: [true, 'Refresh token is required'],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expires: 0 }, // TTL Index: MongoDB will automatically remove document when current time >= expiresAt
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

/**
 * Create a new user session
 */
SessionSchema.statics.createSession = async function (data: {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}): Promise<ISessionDocument> {
  return this.create({
    userId: data.userId,
    token: data.token,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    userAgent: data.userAgent || '',
    ipAddress: data.ipAddress || '',
  });
};

/**
 * Find valid, unexpired session by refresh token
 */
SessionSchema.statics.findValidSession = async function (refreshToken: string): Promise<ISessionDocument | null> {
  return this.findOne({
    refreshToken,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Revoke/delete a single session
 */
SessionSchema.statics.revokeSession = async function (sessionId: string): Promise<boolean> {
  const result = await this.deleteOne({ sessionId });
  return (result.deletedCount ?? 0) > 0;
};

/**
 * Revoke all active sessions for a given user (e.g. on password change or full logout)
 */
SessionSchema.statics.revokeAllUserSessions = async function (userId: string): Promise<number> {
  const result = await this.deleteMany({ userId });
  return result.deletedCount ?? 0;
};

/**
 * Check if the session instance is expired
 */
SessionSchema.methods.isExpired = function (): boolean {
  return new Date() >= this.expiresAt;
};

export const SessionModel = (mongoose.models.Session as ISessionModel) || mongoose.model<ISessionDocument, ISessionModel>('Session', SessionSchema);

export default SessionModel;
