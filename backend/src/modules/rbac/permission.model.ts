import { type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface PermissionDocument {
  code: string;
  description: string;
  group: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = createBaseSchema(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    group: { type: String, required: true, trim: true, maxlength: 80 },
    isSystem: { type: Boolean, required: true, default: false },
  },
  { collection: 'permissions' },
);

permissionSchema.index({ code: 1 }, { unique: true });
permissionSchema.index({ group: 1, code: 1 });

export const PermissionModel = model<PermissionDocument>('Permission', permissionSchema);

export interface PermissionRecord {
  id: string;
  code: string;
  description: string;
  group: string;
  isSystem: boolean;
}

export function toPermissionRecord(
  document: PermissionDocument & { _id: Types.ObjectId },
): PermissionRecord {
  return {
    id: document._id.toString(),
    code: document.code,
    description: document.description,
    group: document.group,
    isSystem: document.isSystem,
  };
}
