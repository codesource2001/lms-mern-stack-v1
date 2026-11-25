import { Router } from 'express';

import { env } from '../config/env.js';
import { sendSuccess } from '../shared/http/response.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { authService } from '../modules/auth/auth.service.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import { createUserRouter } from '../modules/users/user.routes.js';
import { createCategoryRouter, createCourseRouter } from '../modules/courses/course.routes.js';
import { createLessonRouter } from '../modules/lessons/lesson.routes.js';
import { createEnrollmentRouter } from '../modules/enrollments/enrollment.routes.js';

export function createApiRouter(options: { authService?: AuthService } = {}): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    sendSuccess(res, {
      message: 'Atrium API is running',
      data: {
        name: 'Atrium LMS API',
        version: env.APP_VERSION,
        apiVersion: 'v1',
      },
    });
  });

  router.use('/auth', createAuthRouter(options.authService ?? authService));
  router.use('/users', createUserRouter());
  router.use('/categories', createCategoryRouter());
  router.use('/courses', createCourseRouter());
  router.use('/lessons', createLessonRouter());
  router.use('/enrollments', createEnrollmentRouter());

  return router;
}

export const apiRouter = createApiRouter();
