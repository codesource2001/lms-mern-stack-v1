import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

export const questionBankSchema = z.object({
  title: z.string().trim().min(2).max(150),
  courseId: z.string().trim().min(1),
});

export const questionSchema = z.object({
  bankId: z.string().trim().min(1),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  prompt: z.string().trim().min(3).max(5000),
  options: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  correctAnswer: z.string().trim().min(1).max(5000),
  points: z.number().int().min(1).max(100).optional(),
});

export const quizSchema = z.object({
  courseId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(180),
  questionBankId: z.string().trim().min(1),
  questionCount: z.number().int().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(300),
  attemptsAllowed: z.number().int().min(1).max(10).optional(),
  shuffle: z.boolean().optional(),
});

export const answerSchema = z.object({
  questionId: z.string().trim().min(1),
  answer: z.string().max(5000),
});

export const gradeSchema = z.object({
  score: z.number().min(0).max(10000),
});

export const validateQuestionBank = validate({ body: questionBankSchema });
export const validateQuestion = validate({ body: questionSchema });
export const validateQuiz = validate({ body: quizSchema });
export const validateAnswer = validate({ body: answerSchema });
export const validateGrade = validate({ body: gradeSchema });
