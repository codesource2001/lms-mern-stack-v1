import type { RequestHandler } from 'express';

import { sendSuccess } from '../../shared/http/response.js';
import { getValidated } from '../../middlewares/validate.js';
import { hasAdminRole } from '../auth/auth.middleware.js';
import { quizService } from './quiz.service.js';

export function createQuizController() {
  const createBank: RequestHandler = async (req, res) => {
    const input = getValidated<{ title: string; courseId: string }>(req, 'body');
    const bank = await quizService.createBank({
      ...input,
      actorId: req.auth!.userId,
      isAdmin: hasAdminRole(req.auth!),
    });
    sendSuccess(res, { statusCode: 201, message: 'Question bank created', data: { bank } });
  };

  const addQuestion: RequestHandler = async (req, res) => {
    const input = getValidated<{
      bankId: string;
      type: 'multiple_choice' | 'true_false' | 'short_answer';
      prompt: string;
      options?: string[];
      correctAnswer: string;
      points?: number;
    }>(req, 'body');
    const question = await quizService.addQuestion({
      ...input,
      options: input.options ?? [],
      points: input.points ?? 1,
      actorId: req.auth!.userId,
      isAdmin: hasAdminRole(req.auth!),
    });
    sendSuccess(res, { statusCode: 201, message: 'Question added', data: { question } });
  };

  const createQuiz: RequestHandler = async (req, res) => {
    const input = getValidated<{
      courseId: string;
      title: string;
      questionBankId: string;
      questionCount: number;
      durationMinutes: number;
      attemptsAllowed?: number;
      shuffle?: boolean;
    }>(req, 'body');
    const quiz = await quizService.createQuiz({
      ...input,
      attemptsAllowed: input.attemptsAllowed ?? 1,
      shuffle: input.shuffle ?? true,
      actorId: req.auth!.userId,
      isAdmin: hasAdminRole(req.auth!),
    });
    sendSuccess(res, { statusCode: 201, message: 'Quiz created', data: { quiz } });
  };

  const publish: RequestHandler = async (req, res) => {
    const quiz = await quizService.publishQuiz(
      req.params.id as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
    );
    sendSuccess(res, { message: 'Quiz published', data: { quiz } });
  };

  const start: RequestHandler = async (req, res) => {
    const attempt = await quizService.startAttempt(req.params.id as string, req.auth!.userId);
    sendSuccess(res, { statusCode: 201, message: 'Attempt started', data: { attempt } });
  };

  const getAttempt: RequestHandler = async (req, res) => {
    const result = await quizService.getAttempt(
      req.params.id as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
    );
    sendSuccess(res, { message: 'Attempt', data: result });
  };

  const saveAnswer: RequestHandler = async (req, res) => {
    const input = getValidated<{ questionId: string; answer: string }>(req, 'body');
    const result = await quizService.saveAnswer(
      req.params.id as string,
      req.auth!.userId,
      input.questionId,
      input.answer,
    );
    sendSuccess(res, { message: 'Answer saved', data: result });
  };

  const submit: RequestHandler = async (req, res) => {
    const result = await quizService.submitAttempt(req.params.id as string, req.auth!.userId);
    sendSuccess(res, { message: 'Attempt submitted', data: result });
  };

  const grade: RequestHandler = async (req, res) => {
    const input = getValidated<{ score: number }>(req, 'body');
    const attempt = await quizService.gradeAttempt(
      req.params.id as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
      input.score,
    );
    sendSuccess(res, { message: 'Attempt graded', data: { attempt } });
  };

  return {
    createBank,
    addQuestion,
    createQuiz,
    publish,
    start,
    getAttempt,
    saveAnswer,
    submit,
    grade,
  };
}

export const quizController = createQuizController();
