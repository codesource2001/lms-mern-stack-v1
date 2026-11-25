import { AppError } from '../../shared/errors/app-error.js';
import { CourseRepository } from '../courses/course.repository.js';
import { AssignmentRepository, SubmissionRepository } from './assignment.repository.js';
import { toAssignmentRecord } from './assignment.model.js';
import { toSubmissionRecord } from './submission.model.js';

export class AssignmentService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly submissions: SubmissionRepository,
    private readonly courses: CourseRepository,
  ) {}

  async listByCourse(courseId: string, actorId: string, isAdmin: boolean) {
    const course = await this.courses.findById(courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const items = await this.assignments.listByCourse(courseId);
    const isInstructor = course.instructor.toString() === actorId;

    if (!isAdmin && !isInstructor) {
      return items
        .filter((assignment) => assignment.status === 'published')
        .map(toAssignmentRecord);
    }

    return items.map(toAssignmentRecord);
  }

  async create(input: {
    courseId: string;
    title: string;
    description: string;
    dueAt: Date | null;
    maxScore: number;
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

    const document = await this.assignments.create({
      courseId: input.courseId,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt,
      maxScore: input.maxScore,
      createdById: input.actorId,
    });

    return toAssignmentRecord(document);
  }

  async update(id: string, actorId: string, isAdmin: boolean, input: Record<string, unknown>) {
    const assignment = await this.assignments.findById(id);

    if (assignment === null) {
      throw new AppError('Assignment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(assignment.course.toString());

    if (course === null || (!isAdmin && course.instructor.toString() !== actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const document = await this.assignments.update(id, input);

    if (document === null) {
      throw new AppError('Assignment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toAssignmentRecord(document);
  }

  async publish(id: string, actorId: string, isAdmin: boolean) {
    return this.update(id, actorId, isAdmin, { status: 'published' });
  }

  async delete(id: string, actorId: string, isAdmin: boolean) {
    const assignment = await this.assignments.findById(id);

    if (assignment === null) {
      throw new AppError('Assignment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(assignment.course.toString());

    if (course === null || (!isAdmin && course.instructor.toString() !== actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    await this.assignments.delete(id);
  }

  async submit(input: {
    assignmentId: string;
    userId: string;
    fileKey: string | null;
    content: string | null;
  }) {
    const assignment = await this.assignments.findById(input.assignmentId);

    if (assignment === null || assignment.status !== 'published') {
      throw new AppError('Assignment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(assignment.course.toString());

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const existing = await this.submissions.findLatest(input.assignmentId, input.userId);
    const version = existing === null ? 1 : existing.version + 1;
    const isLate = assignment.dueAt !== null && assignment.dueAt.getTime() < Date.now();

    const submission = await this.submissions.create({
      assignmentId: input.assignmentId,
      userId: input.userId,
      version,
      fileKey: input.fileKey,
      content: input.content,
      isLate,
    });

    return toSubmissionRecord(submission);
  }

  async listSubmissions(assignmentId: string, actorId: string, isAdmin: boolean) {
    const assignment = await this.assignments.findById(assignmentId);

    if (assignment === null) {
      throw new AppError('Assignment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(assignment.course.toString());

    if (course === null || (!isAdmin && course.instructor.toString() !== actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const submissions = await this.submissions.listByAssignment(assignmentId);
    return submissions.map(toSubmissionRecord);
  }

  async listMine(userId: string) {
    const submissions = await this.submissions.listByUser(userId);
    return submissions.map(toSubmissionRecord);
  }

  async grade(
    submissionId: string,
    actorId: string,
    isAdmin: boolean,
    input: { grade: number; feedback?: string | null },
  ) {
    const submission = await this.submissions.findById(submissionId);

    if (submission === null) {
      throw new AppError('Submission not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const assignment = await this.assignments.findById(submission.assignment.toString());

    if (assignment === null) {
      throw new AppError('Assignment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await this.courses.findById(assignment.course.toString());

    if (course === null || (!isAdmin && course.instructor.toString() !== actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const updated = await this.submissions.grade(submissionId, {
      grade: input.grade,
      feedback: input.feedback ?? null,
      gradedById: actorId,
    });

    if (updated === null) {
      throw new AppError('Submission not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toSubmissionRecord(updated);
  }
}

export const assignmentRepository = new AssignmentRepository();
export const submissionRepository = new SubmissionRepository();
export const courseRepositoryForAssignments = new CourseRepository();
export const assignmentService = new AssignmentService(
  assignmentRepository,
  submissionRepository,
  courseRepositoryForAssignments,
);
