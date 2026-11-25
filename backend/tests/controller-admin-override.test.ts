/* eslint-disable */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { assignmentService } from '../src/modules/assignments/assignment.service.js';
import { createAssignmentController } from '../src/modules/assignments/assignment.controller.js';
import { courseService } from '../src/modules/courses/course.service.js';
import { createCourseController } from '../src/modules/courses/course.controller.js';
import { lessonService } from '../src/modules/lessons/lesson.service.js';
import { createLessonController } from '../src/modules/lessons/lesson.controller.js';
import { quizService } from '../src/modules/quizzes/quiz.service.js';
import { createQuizController } from '../src/modules/quizzes/quiz.controller.js';

function makeReq(input: {
  roles: string[];
  actorId?: string;
  params?: Record<string, string>;
  body?: unknown;
}) {
  return {
    auth: {
      userId: input.actorId ?? 'actor-1',
      sessionId: 'session-1',
      name: 'Test User',
      email: 'test@example.com',
      roles: input.roles,
      permissions: [],
      tokenVersion: 0,
    },
    params: input.params ?? {},
    validated: input.body === undefined ? {} : { body: input.body },
  } as any;
}

function makeRes() {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('controller administrative override wiring', () => {
  it('passes isAdmin true to assignment creation for an administrator', async () => {
    const create = vi.spyOn(assignmentService, 'create').mockResolvedValue({} as never);

    await createAssignmentController().create(
      makeReq({
        roles: ['admin'],
        actorId: 'admin-1',
        body: { title: 'Task', description: 'Do it' },
      }),
      makeRes(),
      (() => {}) as never,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ isAdmin: true, actorId: 'admin-1' }),
    );
  });

  it('passes isAdmin false to assignment creation for an instructor', async () => {
    const create = vi.spyOn(assignmentService, 'create').mockResolvedValue({} as never);

    await createAssignmentController().create(
      makeReq({
        roles: ['instructor'],
        actorId: 'instructor-1',
        body: { title: 'Task', description: 'Do it' },
      }),
      makeRes(),
      (() => {}) as never,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ isAdmin: false, actorId: 'instructor-1' }),
    );
  });

  it('passes isAdmin true to quiz bank creation for a super administrator', async () => {
    const createBank = vi.spyOn(quizService, 'createBank').mockResolvedValue({} as never);

    await createQuizController().createBank(
      makeReq({
        roles: ['super_admin'],
        actorId: 'super-admin-1',
        body: { title: 'Bank', courseId: 'course-1' },
      }),
      makeRes(),
      (() => {}) as never,
    );

    expect(createBank).toHaveBeenCalledWith(
      expect.objectContaining({ isAdmin: true, actorId: 'super-admin-1' }),
    );
  });

  it('passes isAdmin true to course updates for an administrator', async () => {
    const update = vi.spyOn(courseService, 'update').mockResolvedValue({} as never);

    await createCourseController().update(
      makeReq({ roles: ['admin'], actorId: 'admin-1', params: { id: 'course-1' }, body: {} }),
      makeRes(),
      (() => {}) as never,
    );

    expect(update).toHaveBeenCalledWith('course-1', 'admin-1', true, {});
  });

  it('passes isAdmin true to lesson creation for an administrator', async () => {
    const create = vi.spyOn(lessonService, 'create').mockResolvedValue({} as never);

    await createLessonController().create(
      makeReq({
        roles: ['admin'],
        actorId: 'admin-1',
        params: { courseId: 'course-1' },
        body: { title: 'Lesson', type: 'text' },
      }),
      makeRes(),
      (() => {}) as never,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ isAdmin: true, actorId: 'admin-1' }),
    );
  });
});
