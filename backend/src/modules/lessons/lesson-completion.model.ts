import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface LessonCompletionDocument {
  user: Types.ObjectId;
  lesson: Types.ObjectId;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lessonCompletionSchema = createBaseSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completedAt: { type: Date, required: true, default: Date.now },
  },
  { collection: 'lesson_completions' },
);

lessonCompletionSchema.index({ user: 1, lesson: 1 }, { unique: true });
lessonCompletionSchema.index({ lesson: 1, completedAt: -1 });

export const LessonCompletionModel = model<LessonCompletionDocument>(
  'LessonCompletion',
  lessonCompletionSchema,
);
