/* eslint-disable */
import { describe, expect, it } from 'vitest';

import { LessonService } from '../src/modules/lessons/lesson.service.js';

function makeRepositories() {
  const lessons = new Map<string, any>();
  const courses = new Map<string, any>();

  courses.set('course-1', {
    _id: { toString: () => 'course-1' },
    instructor: { toString: () => 'instructor-1' },
    status: 'published',
  });

  const lessonRepository = {
    async listByCourse() {
      return [...lessons.values()];
    },
    async findById(id: string) {
      return lessons.get(id) ?? null;
    },
    async create(input: any) {
      const lesson = {
        _id: { toString: () => input.title.toLowerCase().replace(/\s+/g, '-') },
        course: { toString: () => input.courseId },
        section: null,
        title: input.title,
        type: input.type,
        content: input.content,
        assetKey: input.assetKey,
        durationSeconds: input.durationSeconds,
        order: input.order,
        isPreview: input.isPreview,
        toObject() {
          return this;
        },
      };
      lessons.set(lesson._id.toString(), lesson);
      return lesson;
    },
    async update(id: string, input: any) {
      const lesson = lessons.get(id);
      if (lesson === undefined) {
        return null;
      }
      Object.assign(lesson, input);
      return lesson;
    },
    async delete(id: string) {
      lessons.delete(id);
    },
    async reorder() {},
    async markComplete() {},
  };

  const courseRepository = {
    async findById(id: string) {
      return courses.get(id) ?? null;
    },
  };

  return { lessonRepository, courseRepository, lessons };
}

describe('LessonService', () => {
  it('creates a lesson for the course owner', async () => {
    const { lessonRepository, courseRepository } = makeRepositories();
    const service = new LessonService(
      lessonRepository as any,
      courseRepository as any,
      async () => true,
    );

    const lesson = await service.create({
      courseId: 'course-1',
      title: 'First lesson',
      type: 'text',
      content: '<p>Hello</p><script>alert(1)</script>',
      actorId: 'instructor-1',
      isAdmin: false,
    });

    expect(lesson.title).toBe('First lesson');
    expect(lesson.content).not.toContain('script');
  });

  it('rejects lesson creation by a non-owner', async () => {
    const { lessonRepository, courseRepository } = makeRepositories();
    const service = new LessonService(
      lessonRepository as any,
      courseRepository as any,
      async () => true,
    );

    await expect(
      service.create({
        courseId: 'course-1',
        title: 'Unauthorized lesson',
        type: 'text',
        actorId: 'instructor-2',
        isAdmin: false,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects asset access for unpublished courses by non-owners', async () => {
    const { lessonRepository, courseRepository } = makeRepositories();
    const courses = courseRepository as any;
    const original = await courses.findById('course-1');
    original.status = 'draft';

    const lesson = await new LessonService(
      lessonRepository as any,
      courseRepository as any,
      async () => true,
    ).create({
      courseId: 'course-1',
      title: 'Protected asset',
      type: 'video',
      assetKey: 'asset-key',
      actorId: 'instructor-1',
      isAdmin: false,
    });

    await expect(
      new LessonService(
        lessonRepository as any,
        courseRepository as any,
        async () => true,
      ).getAsset(lesson.id, 'student-1', false),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects lesson completion without course access', async () => {
    const { lessonRepository, courseRepository } = makeRepositories();
    const service = new LessonService(
      lessonRepository as any,
      courseRepository as any,
      async () => false,
    );
    const lesson = await service.create({
      courseId: 'course-1',
      title: 'Protected lesson',
      type: 'text',
      actorId: 'instructor-1',
      isAdmin: false,
    });

    await expect(service.complete(lesson.id, 'student-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects protected asset access for a published course without enrollment', async () => {
    const { lessonRepository, courseRepository } = makeRepositories();
    const service = new LessonService(
      lessonRepository as any,
      courseRepository as any,
      async () => false,
    );
    const lesson = await service.create({
      courseId: 'course-1',
      title: 'Enrollment gated asset',
      type: 'video',
      assetKey: 'asset-key',
      actorId: 'instructor-1',
      isAdmin: false,
    });

    await expect(service.getAsset(lesson.id, 'student-1', false)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('completes a lesson', async () => {
    const { lessonRepository, courseRepository } = makeRepositories();
    const service = new LessonService(
      lessonRepository as any,
      courseRepository as any,
      async () => true,
    );

    const lesson = await service.create({
      courseId: 'course-1',
      title: 'Completable lesson',
      type: 'text',
      actorId: 'instructor-1',
      isAdmin: false,
    });

    const result = await service.complete(lesson.id, 'student-1');

    expect(result).toMatchObject({ lessonId: lesson.id, completed: true });
  });
});
