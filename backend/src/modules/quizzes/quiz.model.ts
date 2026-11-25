import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuestionBankDocument {
  title: string;
  course: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionBankSchema = createBaseSchema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { collection: 'question_banks' },
);

questionBankSchema.index({ course: 1, title: 1 });

export const QuestionBankModel = model<QuestionBankDocument>('QuestionBank', questionBankSchema);

export interface QuestionDocument {
  bank: Types.ObjectId;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = createBaseSchema(
  {
    bank: { type: Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
    type: { type: String, enum: ['multiple_choice', 'true_false', 'short_answer'], required: true },
    prompt: { type: String, required: true, trim: true, maxlength: 5000 },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true, maxlength: 5000 },
    points: { type: Number, required: true, min: 1, max: 100, default: 1 },
  },
  { collection: 'questions' },
);

questionSchema.index({ bank: 1, createdAt: 1 });

export const QuestionModel = model<QuestionDocument>('Question', questionSchema);

export interface QuizDocument {
  course: Types.ObjectId;
  title: string;
  questionBank: Types.ObjectId;
  questionCount: number;
  durationMinutes: number;
  attemptsAllowed: number;
  shuffle: boolean;
  status: 'draft' | 'published';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = createBaseSchema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    questionBank: { type: Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
    questionCount: { type: Number, required: true, min: 1, max: 100 },
    durationMinutes: { type: Number, required: true, min: 1, max: 300 },
    attemptsAllowed: { type: Number, required: true, min: 1, max: 10, default: 1 },
    shuffle: { type: Boolean, required: true, default: true },
    status: { type: String, enum: ['draft', 'published'], required: true, default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { collection: 'quizzes' },
);

quizSchema.index({ course: 1, status: 1 });

export const QuizModel = model<QuizDocument>('Quiz', quizSchema);

export interface QuizAttemptDocument {
  quiz: Types.ObjectId;
  user: Types.ObjectId;
  questionIds: Types.ObjectId[];
  answers: Map<string, string>;
  startedAt: Date;
  expiresAt: Date;
  submittedAt: Date | null;
  score: number | null;
  maxScore: number | null;
  status: 'in_progress' | 'submitted' | 'graded';
  attemptNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const quizAttemptSchema = createBaseSchema(
  {
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Question' }], required: true },
    answers: { type: Map, of: String, default: {} },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'graded'],
      required: true,
      default: 'in_progress',
    },
    attemptNumber: { type: Number, required: true, min: 1 },
  },
  { collection: 'quiz_attempts' },
);

quizAttemptSchema.index({ quiz: 1, user: 1, attemptNumber: 1 });
quizAttemptSchema.index({ user: 1, status: 1, expiresAt: 1 });

export const QuizAttemptModel = model<QuizAttemptDocument>('QuizAttempt', quizAttemptSchema);
