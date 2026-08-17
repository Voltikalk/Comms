import mongoose, { Schema, Document, Model } from 'mongoose';
import type { LoginAttempt } from '../types/auth.types';


/**
 * Interface representing LoginAttempt document in MongoDB
 */
export interface ILoginAttemptDocument extends Document, Omit<LoginAttempt, 'attemptId'> {
  attemptId: string;
}

/**
 * Interface for LoginAttempt Model with static methods
 */
export interface ILoginAttemptModel extends Model<ILoginAttemptDocument> {
  recordAttempt(data: {
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ILoginAttemptDocument>;
  getRecentFailedAttempts(email: string, windowMinutes?: number): Promise<number>;
  isLocked(email: string, maxAttempts?: number, windowMinutes?: number): Promise<boolean>;
}

const LoginAttemptSchema = new Schema<ILoginAttemptDocument, ILoginAttemptModel>(
  {
    attemptId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => 'att_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      // Retain audit logs for 30 days, then auto-delete via TTL index
      expires: 30 * 24 * 60 * 60,
    },
    ipAddress: {
      type: String,
      default: '',
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/**
 * Compound index for fast querying of recent login attempts by email
 */
LoginAttemptSchema.index({ email: 1, timestamp: -1 });

/**
 * Record a login attempt
 */
LoginAttemptSchema.statics.recordAttempt = async function (data: {
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ILoginAttemptDocument> {
  return this.create({
    email: data.email.trim().toLowerCase(),
    success: data.success,
    ipAddress: data.ipAddress || '',
    userAgent: data.userAgent || '',
    timestamp: new Date(),
  });
};

/**
 * Count failed login attempts within a given window (default 15 minutes)
 */
LoginAttemptSchema.statics.getRecentFailedAttempts = async function (
  email: string,
  windowMinutes: number = 15
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  return this.countDocuments({
    email: email.trim().toLowerCase(),
    success: false,
    timestamp: { $gte: since },
  });
};

/**
 * Check if the account is temporarily locked due to excessive failed attempts
 */
LoginAttemptSchema.statics.isLocked = async function (
  email: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<boolean> {
  const failedCount = await this.getRecentFailedAttempts(email, windowMinutes);
  return failedCount >= maxAttempts;
};

export const LoginAttemptModel =
  (mongoose.models.LoginAttempt as ILoginAttemptModel) ||
  mongoose.model<ILoginAttemptDocument, ILoginAttemptModel>('LoginAttempt', LoginAttemptSchema);

export default LoginAttemptModel;
