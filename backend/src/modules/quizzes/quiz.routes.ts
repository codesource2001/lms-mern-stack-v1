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
import { mutatingLimiter } from '../../middlewares/endpoint-rate-limit.js';
import { validateIdParam } from '../../middlewares/validate-id.js';

export function createQuizRouter() {
  const router = Router();

  router.post(
    '/banks',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    mutatingLimiter,
    validateQuestionBank,
    quizController.createBank,
  );
  router.post(
    '/questions',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    mutatingLimiter,
    validateQuestion,
    quizController.addQuestion,
  );

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    mutatingLimiter,
    validateQuiz,
    quizController.createQuiz,
  );
  router.post(
    '/:id/publish',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    quizController.publish,
  );

  router.post(
    '/:id/attempts',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_ATTEMPT),
    mutatingLimiter,
    validateIdParam('id'),
    quizController.start,
  );
  router.get('/attempts/:id', requireAuth, validateIdParam('id'), quizController.getAttempt);
  router.post(
    '/attempts/:id/answers',
    requireAuth,
    mutatingLimiter,
    validateIdParam('id'),
    validateAnswer,
    quizController.saveAnswer,
  );
  router.post(
    '/attempts/:id/submit',
    requireAuth,
    mutatingLimiter,
    validateIdParam('id'),
    quizController.submit,
  );
  router.post(
    '/attempts/:id/grade',
    requireAuth,
    requirePermission(PERMISSIONS.QUIZZES_GRADE),
    mutatingLimiter,
    validateIdParam('id'),
    validateGrade,
    quizController.grade,
  );

  return router;
}

export const quizRouter = createQuizRouter();
