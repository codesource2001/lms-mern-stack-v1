import { Schema, type SchemaDefinition, type SchemaOptions } from 'mongoose';

function transformDocument(
  _document: unknown,
  returnedObject: Record<string, unknown>,
): Record<string, unknown> {
  const transformed = { ...returnedObject };

  /*
   * Mongoose's `id` virtual is enabled below, so remove only the internal
   * `_id`. Converting `_id` manually would require String() on an unknown
   * object and can mask non-ObjectId identifiers.
   */
  delete transformed._id;
  delete transformed.__v;

  return transformed;
}

/**
 * Applies Atrium's serialization convention: `_id` becomes `id` and the
 * internal version key is hidden. `__v` remains in the database for
 * optimistic concurrency.
 */
export function applyBaseSerialization(schema: Schema): Schema {
  schema.set('toJSON', { virtuals: true, transform: transformDocument });
  schema.set('toObject', { virtuals: true, transform: transformDocument });

  return schema;
}

export const BASE_SCHEMA_OPTIONS = {
  timestamps: true,
} satisfies SchemaOptions;

/**
 * Creates a schema with Atrium's base conventions. Always build models through
 * this factory: Mongoose's `timestamps` option must be set at construction
 * time, so applying it to an existing schema is not reliable.
 */
export function createBaseSchema(
  definition: SchemaDefinition,
  options: SchemaOptions = {},
): Schema {
  const schema = new Schema(definition, { ...BASE_SCHEMA_OPTIONS, ...options });

  return applyBaseSerialization(schema);
}
