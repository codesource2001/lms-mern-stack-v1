import sanitizeHtml from 'sanitize-html';

import { AppError } from '../../shared/errors/app-error.js';
import { storageProvider } from '../../infrastructure/storage/storage.service.js';
import { CourseRepository } from '../courses/course.repository.js';
import { enrollmentService } from '../enrollments/enrollment.service.js';
import { LessonRepository } from './lesson.repository.js';
import { toLessonRecord } from './lesson.model.js';

export class LessonService {
  constructor(
    private readonly lessons: LessonRepository,
    private readonly courses: CourseRepository,
    private readonly canAccess: (userId: string, courseId: string) => Promise<boolean>,
  ) {}

  async list(courseId: string) {
    const course = await this.courses.findById(courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return (await this.lessons.listByCourse(courseId)).map(toLessonRecord);
  }

  async create(input: {
    courseId: string;
    sectionId?: string | null;
    title: string;
    type: 'video' | 'text' | 'pdf' | 'resource';
    content?: string | null;
    assetKey?: string | null;
    durationSeconds?: number | null;
    isPreview?: boolean | undefined;
    actorId: string;
    isAdmin: boolean;
  }) {
    const course = await this.courses.findById(input.courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!input.isAdmin && course.instructor.toString() !== input.actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const existing = await this.lessons.listByCourse(input.courseId);
    const lesson = await this.lessons.create({
      courseId: input.courseId,
      sectionId: input.sectionId ?? null,
      title: input.title,
      type: input.type,
      content:
        input.content === undefined || input.content === null ? null : sanitizeHtml(input.content),
      assetKey: input.assetKey ?? null,
      durationSeconds: input.durationSeconds ?? null,
      order: existing.length,
      isPreview: input.isPreview ?? false,
    });

    return toLessonRecord(lesson);
  }

  async update(id: string, actorId: string, isAdmin: boolean, input: Record<string, unknown>) {
    const lesson = await this.lessons.findById(id);

    if (lesson === null) {
      throw new AppError('Lesson not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(lesson.course.toString());

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const update: Record<string, unknown> = { ...input };

    if (typeof input.content === 'string') {
      update.content = sanitizeHtml(input.content);
    }

    const document = await this.lessons.update(id, update);

    if (document === null) {
      throw new AppError('Lesson not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toLessonRecord(document);
  }

  async delete(id: string, actorId: string, isAdmin: boolean) {
    const lesson = await this.lessons.findById(id);

    if (lesson === null) {
      throw new AppError('Lesson not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(lesson.course.toString());

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    if (lesson.assetKey !== null) {
      await storageProvider.delete(lesson.assetKey);
    }

    await this.lessons.delete(id);
  }

  async reorder(courseId: string, orderedIds: string[], actorId: string, isAdmin: boolean) {
    const course = await this.courses.findById(courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    await this.lessons.reorder(courseId, orderedIds);

    return this.list(courseId);
  }

  async complete(lessonId: string, userId: string) {
    const lesson = await this.lessons.findById(lessonId);

    if (lesson === null) {
      throw new AppError('Lesson not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const courseId = lesson.course.toString();

    if (!(await this.canAccess(userId, courseId))) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    await this.lessons.markComplete(userId, lessonId);

    return { lessonId, completed: true };
  }

  async getAsset(lessonId: string, userId: string | null, isAdmin: boolean) {
    const lesson = await this.lessons.findById(lessonId);

    if (lesson === null || lesson.assetKey === null) {
      throw new AppError('Asset not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(lesson.course.toString());

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const isOwner = userId !== null && course.instructor.toString() === userId;
    const isPublished = course.status === 'published';
    const privileged = isOwner || isAdmin;

    if (!privileged && !isPublished) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    if (
      !privileged &&
      (userId === null || !(await this.canAccess(userId, lesson.course.toString())))
    ) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    return { key: lesson.assetKey, path: storageProvider.resolvePath(lesson.assetKey) };
  }

  async getLessonCounts(courseIds: readonly string[]) {
    const rows = await this.lessons.lessonCountsByCourse(courseIds);
    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  async getCompletionCounts(courseIds: readonly string[]) {
    const rows = await this.lessons.completionCountsByCourse(courseIds);
    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  async getUserCompletionCount(userId: string, courseId: string): Promise<number> {
    return this.lessons.userCompletionCountByCourse(userId, courseId);
  }
}

export const lessonRepository = new LessonRepository();
export const courseRepositoryForLessons = new CourseRepository();
export const lessonService = new LessonService(
  lessonRepository,
  courseRepositoryForLessons,
  (userId, courseId) => enrollmentService.hasAccess(userId, courseId, false),
);
