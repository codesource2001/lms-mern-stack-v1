import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export type UserStatus = 'pending_verification' | 'active' | 'suspended';

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  roles: Types.ObjectId[];
  status: UserStatus;
  emailVerifiedAt: Date | null;
  passwordChangedAt: Date;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockoutLevel: number;
  lockUntil: Date | null;
  tokenVersion: number;
  emailVerification: {
    tokenHash: string;
    expiresAt: Date;
    sentAt: Date;
  } | null;
  passwordReset: {
    tokenHash: string;
    expiresAt: Date;
    requestedAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const tokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    sentAt: { type: Date, required: true },
  },
  { _id: false },
);

const passwordResetSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    requestedAt: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = createBaseSchema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    roles: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
      required: true,
      default: [],
    },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended'],
      required: true,
      default: 'pending_verification',
    },
    emailVerifiedAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, required: true, default: Date.now },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, required: true, default: 0, min: 0 },
    lockoutLevel: { type: Number, required: true, default: 0, min: 0 },
    lockUntil: { type: Date, default: null },
    tokenVersion: { type: Number, required: true, default: 0, min: 0 },
    emailVerification: { type: tokenSchema, default: null },
    passwordReset: { type: passwordResetSchema, default: null },
  },
  { collection: 'users' },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ lockUntil: 1 });

export const UserModel = model<UserDocument>('User', userSchema);
