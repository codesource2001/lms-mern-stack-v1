import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { courseController, upload } from './course.controller.js';
import { categoryService } from './category.service.js';
import {
  validateCategory,
  validateCourseCreate,
  validateCourseUpdate,
  validateCourseList,
  validateSection,
} from './course.validation.js';
import { sendSuccess } from '../../shared/http/response.js';
import { lessonController } from '../lessons/lesson.controller.js';
import { validateLessonCreate, validateReorder } from '../lessons/lesson.validation.js';

export function createCategoryRouter() {
  const router = Router();

  router.get('/', async (_req, res) => {
    const categories = await categoryService.list();
    sendSuccess(res, { message: 'Categories', data: { items: categories } });
  });

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    validateCategory,
    async (req, res) => {
      const category = await categoryService.create(
        req.body as { name: string; description?: string; parentId?: string },
      );
      sendSuccess(res, { statusCode: 201, message: 'Category created', data: { category } });
    },
  );

  router.patch(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    validateCategory,
    async (req, res) => {
      const category = await categoryService.update(
        req.params.id as string,
        req.body as { name?: string; description?: string | null; parentId?: string | null },
      );
      sendSuccess(res, { message: 'Category updated', data: { category } });
    },
  );

  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    async (req, res) => {
      await categoryService.delete(req.params.id as string);
      sendSuccess(res, { message: 'Category deleted', data: {} });
    },
  );

  return router;
}

export function createCourseRouter() {
  const router = Router();

  router.get('/', validateCourseList, courseController.list);
  router.get(
    '/mine',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    courseController.mine,
  );
  router.get('/:id', courseController.get);

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    validateCourseCreate,
    courseController.create,
  );
  router.patch(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    validateCourseUpdate,
    courseController.update,
  );
  router.post(
    '/:id/submit',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    courseController.submit,
  );
  router.post(
    '/:id/publish',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_PUBLISH),
    courseController.publish,
  );
  router.post(
    '/:id/archive',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    courseController.archive,
  );
  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_DELETE),
    courseController.remove,
  );

  router.get('/:id/sections', courseController.sections);
  router.post(
    '/:id/sections',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    validateSection,
    courseController.createSection,
  );
  router.post(
    '/:id/thumbnail',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    upload.single('file'),
    courseController.uploadThumbnail,
  );
  router.get(
    '/:id/lessons',
    requireAuth,
    requirePermission(PERMISSIONS.LESSONS_READ),
    lessonController.list,
  );
  router.post(
    '/:id/lessons',
    requireAuth,
    requirePermission(PERMISSIONS.LESSONS_WRITE),
    validateLessonCreate,
    lessonController.create,
  );
  router.post(
    '/:id/lessons/reorder',
    requireAuth,
    requirePermission(PERMISSIONS.LESSONS_WRITE),
    validateReorder,
    lessonController.reorder,
  );

  return router;
}
