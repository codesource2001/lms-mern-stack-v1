/* eslint-disable */
import { describe, expect, it } from 'vitest';

import { AssignmentService } from '../src/modules/assignments/assignment.service.js';

const COURSE_ID = 'course-1';
const OTHER_COURSE_ID = 'course-2';
const INSTRUCTOR_ID = 'instructor-1';
const OTHER_INSTRUCTOR_ID = 'instructor-2';
const STUDENT_ID = 'student-1';
const ADMIN_ID = 'admin-1';

function makeFixture() {
  const assignments = new Map<string, any>();
  const submissions = new Map<string, any>();
  let nextAssignmentId = 1;
  let nextSubmissionId = 1;

  const assignmentRepository = {
    async findById(id: string) {
      return assignments.get(id) ?? null;
    },
    async listByCourse(courseId: string) {
      return [...assignments.values()].filter(
        (assignment) => assignment.course.toString() === courseId,
      );
    },
    async create(input: any) {
      const id = `assignment-${nextAssignmentId++}`;
      const document = {
        _id: { toString: () => id },
        course: { toString: () => input.courseId },
        title: input.title,
        description: input.description,
        dueAt: input.dueAt,
        maxScore: input.maxScore,
        status: 'draft',
        createdBy: { toString: () => input.createdById },
        createdAt: new Date('2026-11-01T00:00:00.000Z'),
        updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      };

      assignments.set(id, document);
      return document;
    },
    async update(id: string, input: Record<string, unknown>) {
      const document = assignments.get(id);

      if (document === undefined) {
        return null;
      }

      Object.assign(document, input);
      return document;
    },
    async delete(id: string) {
      assignments.delete(id);
    },
  };

  const submissionRepository = {
    async findById(id: string) {
      return submissions.get(id) ?? null;
    },
    async findLatest(assignmentId: string, userId: string) {
      const matches = [...submissions.values()]
        .filter(
          (submission) =>
            submission.assignment.toString() === assignmentId &&
            submission.user.toString() === userId,
        )
        .sort((left, right) => right.version - left.version);

      return matches[0] ?? null;
    },
    async listByAssignment(assignmentId: string) {
      return [...submissions.values()].filter(
        (submission) => submission.assignment.toString() === assignmentId,
      );
    },
    async listByUser(userId: string) {
      return [...submissions.values()].filter(
        (submission) => submission.user.toString() === userId,
      );
    },
    async create(input: any) {
      const id = `submission-${nextSubmissionId++}`;
      const document = {
        _id: { toString: () => id },
        assignment: { toString: () => input.assignmentId },
        user: { toString: () => input.userId },
        version: input.version,
        fileKey: input.fileKey,
        content: input.content,
        submittedAt: new Date(),
        isLate: input.isLate,
        grade: null,
        feedback: null,
        gradedBy: null,
        gradedAt: null,
        status: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      submissions.set(id, document);
      return document;
    },
    async grade(id: string, input: any) {
      const document = submissions.get(id);

      if (document === undefined) {
        return null;
      }

      Object.assign(document, {
        grade: input.grade,
        feedback: input.feedback,
        gradedBy: { toString: () => input.gradedById },
        gradedAt: new Date(),
        status: 'graded',
      });

      return document;
    },
  };

  const courses = new Map<string, any>([
    [
      COURSE_ID,
      {
        _id: { toString: () => COURSE_ID },
        instructor: { toString: () => INSTRUCTOR_ID },
        status: 'published',
      },
    ],
    [
      OTHER_COURSE_ID,
      {
        _id: { toString: () => OTHER_COURSE_ID },
        instructor: { toString: () => OTHER_INSTRUCTOR_ID },
        status: 'published',
      },
    ],
  ]);

  const courseRepository = {
    async findById(id: string) {
      return courses.get(id) ?? null;
    },
  };

  const service = new AssignmentService(
    assignmentRepository as never,
    submissionRepository as never,
    courseRepository as never,
  );

  async function seedAssignment(input: {
    courseId?: string;
    title: string;
    status?: 'draft' | 'published';
    dueAt?: Date | null;
  }) {
    const assignment = await assignmentRepository.create({
      courseId: input.courseId ?? COURSE_ID,
      title: input.title,
      description: 'Describe the task',
      dueAt: input.dueAt ?? null,
      maxScore: 100,
      createdById: INSTRUCTOR_ID,
    });
    assignment.status = input.status ?? 'draft';
    return assignment;
  }

  return { service, assignments, submissions, seedAssignment };
}

describe('AssignmentService', () => {
  it('hides draft assignments from learners while instructors see every assignment', async () => {
    const fixture = makeFixture();
    await fixture.seedAssignment({ title: 'Published task', status: 'published' });
    await fixture.seedAssignment({ title: 'Draft task' });

    const learnerView = await fixture.service.listByCourse(COURSE_ID, STUDENT_ID, false);
    const instructorView = await fixture.service.listByCourse(COURSE_ID, INSTRUCTOR_ID, false);

    expect(learnerView.map((assignment) => assignment.title)).toEqual(['Published task']);
    expect(instructorView).toHaveLength(2);
  });

  it('rejects assignment creation by an instructor who does not own the course', async () => {
    const fixture = makeFixture();

    await expect(
      fixture.service.create({
        courseId: COURSE_ID,
        title: 'Unauthorized task',
        description: 'Should not exist',
        dueAt: null,
        maxScore: 100,
        actorId: OTHER_INSTRUCTOR_ID,
        isAdmin: false,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('allows an administrator to create and publish an assignment on another instructor course', async () => {
    const fixture = makeFixture();

    const assignment = await fixture.service.create({
      courseId: COURSE_ID,
      title: 'Admin created task',
      description: 'Created with administrative override',
      dueAt: null,
      maxScore: 50,
      actorId: ADMIN_ID,
      isAdmin: true,
    });

    expect(assignment).toMatchObject({
      title: 'Admin created task',
      status: 'draft',
      maxScore: 50,
    });

    const published = await fixture.service.publish(assignment.id, ADMIN_ID, true);
    expect(published.status).toBe('published');

    const deleted = await fixture.service.delete(assignment.id, ADMIN_ID, true);
    expect(deleted).toBeUndefined();
    expect(fixture.assignments.size).toBe(0);
  });

  it('rejects assignment deletion by an instructor who does not own the course', async () => {
    const fixture = makeFixture();
    const assignment = await fixture.seedAssignment({ title: 'Protected task' });

    await expect(
      fixture.service.delete(assignment._id.toString(), OTHER_INSTRUCTOR_ID, false),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(fixture.assignments.size).toBe(1);
  });

  it('flags a submission as late only when the deadline has passed', async () => {
    const fixture = makeFixture();
    const pastDue = await fixture.seedAssignment({
      title: 'Past due',
      status: 'published',
      dueAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    const futureDue = await fixture.seedAssignment({
      title: 'Future due',
      status: 'published',
      dueAt: new Date('2999-01-01T00:00:00.000Z'),
    });

    const late = await fixture.service.submit({
      assignmentId: pastDue._id.toString(),
      userId: STUDENT_ID,
      fileKey: null,
      content: 'Late work',
    });
    const onTime = await fixture.service.submit({
      assignmentId: futureDue._id.toString(),
      userId: STUDENT_ID,
      fileKey: null,
      content: 'On time work',
    });

    expect(late.isLate).toBe(true);
    expect(onTime.isLate).toBe(false);
  });

  it('increments the submission version when a learner resubmits', async () => {
    const fixture = makeFixture();
    const assignment = await fixture.seedAssignment({
      title: 'Resubmission task',
      status: 'published',
    });

    const first = await fixture.service.submit({
      assignmentId: assignment._id.toString(),
      userId: STUDENT_ID,
      fileKey: 'submissions/first.pdf',
      content: null,
    });
    const second = await fixture.service.submit({
      assignmentId: assignment._id.toString(),
      userId: STUDENT_ID,
      fileKey: 'submissions/second.pdf',
      content: null,
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(fixture.submissions.size).toBe(2);
  });

  it('rejects submissions to an unpublished assignment', async () => {
    const fixture = makeFixture();
    const assignment = await fixture.seedAssignment({ title: 'Draft task' });

    await expect(
      fixture.service.submit({
        assignmentId: assignment._id.toString(),
        userId: STUDENT_ID,
        fileKey: null,
        content: 'Too early',
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('rejects grading by an instructor who does not own the course', async () => {
    const fixture = makeFixture();
    const assignment = await fixture.seedAssignment({ title: 'Graded task', status: 'published' });
    const submission = await fixture.service.submit({
      assignmentId: assignment._id.toString(),
      userId: STUDENT_ID,
      fileKey: null,
      content: 'Answer',
    });

    await expect(
      fixture.service.grade(submission.id, OTHER_INSTRUCTOR_ID, false, { grade: 80 }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('allows the course instructor and an administrator to grade a submission', async () => {
    const fixture = makeFixture();
    const assignment = await fixture.seedAssignment({ title: 'Graded task', status: 'published' });
    const submission = await fixture.service.submit({
      assignmentId: assignment._id.toString(),
      userId: STUDENT_ID,
      fileKey: null,
      content: 'Answer',
    });

    const instructorGraded = await fixture.service.grade(submission.id, INSTRUCTOR_ID, false, {
      grade: 75,
      feedback: 'Solid work',
    });
    expect(instructorGraded).toMatchObject({
      grade: 75,
      feedback: 'Solid work',
      status: 'graded',
      gradedById: INSTRUCTOR_ID,
    });

    const adminGraded = await fixture.service.grade(submission.id, ADMIN_ID, true, { grade: 90 });
    expect(adminGraded).toMatchObject({ grade: 90, status: 'graded', gradedById: ADMIN_ID });
  });

  it('rejects listing submissions for an instructor who does not own the course', async () => {
    const fixture = makeFixture();
    const assignment = await fixture.seedAssignment({
      title: 'Submissions task',
      status: 'published',
    });

    await expect(
      fixture.service.listSubmissions(assignment._id.toString(), OTHER_INSTRUCTOR_ID, false),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    const adminView = await fixture.service.listSubmissions(
      assignment._id.toString(),
      ADMIN_ID,
      true,
    );
    expect(adminView).toEqual([]);
  });
});
