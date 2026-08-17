import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { AUTH_CONSTANTS, type UserSanitized } from '../types/auth.types';


/**
 * Interface representing User document in MongoDB with Mongoose methods
 */
export interface IUserDocument extends Document {
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

  // Document methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSanitizedJSON(): UserSanitized;
}

/**
 * Interface for User Model with static methods
 */
export interface IUserModel extends Model<IUserDocument> {
  hashPassword(password: string): Promise<{ passwordHash: string; salt: string }>;
  findByEmailOrUsername(identifier: string): Promise<IUserDocument | null>;
}

const UserSchema = new Schema<IUserDocument, IUserModel>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    salt: {
      type: String,
      required: [true, 'Salt is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [70, 'Bio cannot exceed 70 characters'],
      default: '',
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    statusEmoji: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    versionKey: false,
  }
);

/**
 * Static method to generate salt and hash password with bcrypt (salt rounds = 12)
 */
UserSchema.statics.hashPassword = async function (password: string): Promise<{ passwordHash: string; salt: string }> {
  const salt = await bcrypt.genSalt(AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);
  return { passwordHash, salt };
};

/**
 * Static method to find user by email or username
 */
UserSchema.statics.findByEmailOrUsername = async function (identifier: string): Promise<IUserDocument | null> {
  const cleanIdentifier = identifier.trim().toLowerCase();
  return this.findOne({
    $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
  });
};

/**
 * Instance method to compare candidate password with stored hash
 */
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Convert user document to sanitized public representation
 */
UserSchema.methods.toSanitizedJSON = function (): UserSanitized {
  return {
    userId: this.userId,
    email: this.email,
    username: this.username,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
    isActive: this.isActive,
    firstName: this.firstName,
    lastName: this.lastName,
    bio: this.bio,
    phoneNumber: this.phoneNumber,
    avatarUrl: this.avatarUrl,
    statusEmoji: this.statusEmoji,
  };
};

export const UserModel = (mongoose.models.User as IUserModel) || mongoose.model<IUserDocument, IUserModel>('User', UserSchema);

export default UserModel;
