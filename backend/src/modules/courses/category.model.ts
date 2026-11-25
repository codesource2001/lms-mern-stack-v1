import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface CategoryDocument {
  name: string;
  slug: string;
  description: string | null;
  parent: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = createBaseSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 500 },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { collection: 'categories' },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1, name: 1 });

export const CategoryModel = model<CategoryDocument>('Category', categorySchema);

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
}

export function toCategoryRecord(
  document: CategoryDocument & { _id: Types.ObjectId },
): CategoryRecord {
  return {
    id: document._id.toString(),
    name: document.name,
    slug: document.slug,
    description: document.description,
    parentId: document.parent === null ? null : document.parent.toString(),
  };
}
