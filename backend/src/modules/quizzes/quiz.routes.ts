import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { quizController } from './quiz.controller.js';
import {
  validateQuestionBank,
  validateQuestion,
  validateQuiz,
  validateAnswer,
  validateGrade,
} from './quiz.validation.js';

export function createQuizRouter() {
  const router = Router();

  router.post(
    '/banks',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    validateQuestionBank,
    quizController.createBank,
  );
  router.post(
    '/questions',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    validateQuestion,
    quizController.addQuestion,
  );

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    validateQuiz,
    quizController.createQuiz,
  );
  router.post(
    '/:id/publish',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    quizController.publish,
  );

  router.post(
    '/:id/attempts',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_ATTEMPT),
    quizController.start,
  );
  router.get('/attempts/:id', requireAuth, quizController.getAttempt);
  router.post('/attempts/:id/answers', requireAuth, validateAnswer, quizController.saveAnswer);
  router.post('/attempts/:id/submit', requireAuth, quizController.submit);
  router.post(
    '/attempts/:id/grade',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_GRADE),
    validateGrade,
    quizController.grade,
  );

  return router;
}

export const quizRouter = createQuizRouter();
