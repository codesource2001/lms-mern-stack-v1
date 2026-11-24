import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { createBaseSchema } from '../src/infrastructure/mongo/plugins/base-schema.js';
import {
  applySoftDelete,
  isDeleted,
  markDeleted,
  NOT_DELETED_FILTER,
  restoreDeleted,
  type SoftDeleteFields,
} from '../src/infrastructure/mongo/plugins/soft-delete.js';

describe('schema conventions', () => {
  it('adds timestamp paths and serializes id without internal fields', () => {
    const schema = createBaseSchema({ title: { type: String, required: true } });
    const Model = mongoose.model('ConventionTest', schema);
    const document = new Model({ title: 'Architecture' });

    expect(schema.path('createdAt')).toBeDefined();
    expect(schema.path('updatedAt')).toBeDefined();

    const serialized: unknown = JSON.parse(JSON.stringify(document));
    const record = serialized as Record<string, unknown>;

    expect(record.id).toEqual(expect.any(String));
    expect(record.title).toBe('Architecture');
    expect(record._id).toBeUndefined();
    expect(record.__v).toBeUndefined();
  });

  it('adds opt-in soft-delete fields and requires explicit filtering', () => {
    const schema = applySoftDelete(createBaseSchema({ name: String }));

    expect(schema.path('deletedAt')).toBeDefined();
    expect(schema.path('deletedBy')).toBeDefined();
    expect(NOT_DELETED_FILTER).toEqual({ deletedAt: null });
  });

  it('marks and restores soft-deleted records', () => {
    const actorId = new mongoose.Types.ObjectId();
    const record: SoftDeleteFields = { deletedAt: null, deletedBy: null };

    expect(isDeleted(record)).toBe(false);

    markDeleted(record, actorId);
    expect(isDeleted(record)).toBe(true);
    expect(record.deletedAt).toBeInstanceOf(Date);
    expect(record.deletedBy).toBe(actorId);

    restoreDeleted(record);
    expect(isDeleted(record)).toBe(false);
    expect(record.deletedBy).toBeNull();
  });
});
