import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface RoleDocument {
  slug: string;
  name: string;
  description: string;
  rank: number;
  isSystem: boolean;
  permissions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = createBaseSchema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    rank: { type: Number, required: true, min: 0 },
    isSystem: { type: Boolean, required: true, default: false },
    permissions: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
      default: [],
    },
  },
  { collection: 'roles' },
);

roleSchema.index({ slug: 1 }, { unique: true });
roleSchema.index({ rank: -1, slug: 1 });

export const RoleModel = model<RoleDocument>('Role', roleSchema);

export interface RoleRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  rank: number;
  isSystem: boolean;
  permissionCodes: string[];
}

export function toRoleRecord(
  document: RoleDocument & { _id: Types.ObjectId },
  permissionCodes: readonly string[],
): RoleRecord {
  return {
    id: document._id.toString(),
    slug: document.slug,
    name: document.name,
    description: document.description,
    rank: document.rank,
    isSystem: document.isSystem,
    permissionCodes: [...permissionCodes],
  };
}
