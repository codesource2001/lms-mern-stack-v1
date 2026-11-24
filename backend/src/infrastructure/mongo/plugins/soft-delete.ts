import { Schema, type Types } from 'mongoose';

export interface SoftDeleteFields {
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
}

/**
 * Opt-in soft-delete fields. Queries are intentionally NOT auto-filtered:
 * repositories must add `NOT_DELETED_FILTER` explicitly so that administrative
 * and restore queries can still see deleted records. This avoids the surprise
 * of hidden data in joins and aggregations.
 */
export function applySoftDelete(schema: Schema): Schema {
  schema.add({
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, default: null, ref: 'User' },
  });

  return schema;
}

export const NOT_DELETED_FILTER = { deletedAt: null } as const;

export function markDeleted<T extends SoftDeleteFields>(document: T, actorId?: Types.ObjectId): T {
  document.deletedAt = new Date();
  document.deletedBy = actorId ?? null;

  return document;
}

export function restoreDeleted<T extends SoftDeleteFields>(document: T): T {
  document.deletedAt = null;
  document.deletedBy = null;

  return document;
}

export function isDeleted(document: SoftDeleteFields): boolean {
  return document.deletedAt instanceof Date;
}
