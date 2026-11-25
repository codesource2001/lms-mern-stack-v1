import type { RequestHandler } from 'express';
import multer from 'multer';

import { sendSuccess } from '../../shared/http/response.js';
import { getValidated } from '../../middlewares/validate.js';
import { hasAdminRole } from '../auth/auth.middleware.js';
import { storageProvider } from '../../infrastructure/storage/storage.service.js';
import { assignmentService } from './assignment.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function createAssignmentController() {
  const list: RequestHandler = async (req, res) => {
    const items = await assignmentService.listByCourse(
      req.params.courseId as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
    );
    sendSuccess(res, { message: 'Assignments', data: { items } });
  };

  const create: RequestHandler = async (req, res) => {
    const input = getValidated<{
      title: string;
      description: string;
      dueAt?: string;
      maxScore?: number;
    }>(req, 'body');
    const assignment = await assignmentService.create({
      courseId: req.params.courseId as string,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt === undefined ? null : new Date(input.dueAt),
      maxScore: input.maxScore ?? 100,
      actorId: req.auth!.userId,
      isAdmin: hasAdminRole(req.auth!),
    });
    sendSuccess(res, { statusCode: 201, message: 'Assignment created', data: { assignment } });
  };

  const update: RequestHandler = async (req, res) => {
    const input = getValidated<Record<string, unknown>>(req, 'body');
    const assignment = await assignmentService.update(
      req.params.id as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
      input,
    );
    sendSuccess(res, { message: 'Assignment updated', data: { assignment } });
  };

  const publish: RequestHandler = async (req, res) => {
    const assignment = await assignmentService.publish(
      req.params.id as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
    );
    sendSuccess(res, { message: 'Assignment published', data: { assignment } });
  };

  const remove: RequestHandler = async (req, res) => {
    await assignmentService.delete(
      req.params.id as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
    );
    sendSuccess(res, { message: 'Assignment deleted', data: {} });
  };

  const submit: RequestHandler = async (req, res) => {
    const input = getValidated<{ content?: string }>(req, 'body');
    const file = (req as { file?: { buffer: Buffer; mimetype: string; originalname: string } })
      .file;

    let fileKey: string | null = null;

    if (file !== undefined) {
      const stored = await storageProvider.save({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        maxSizeBytes: 10 * 1024 * 1024,
      });
      fileKey = stored.key;
    }

    const submission = await assignmentService.submit({
      assignmentId: req.params.id as string,
      userId: req.auth!.userId,
      fileKey,
      content: input.content ?? null,
    });

    sendSuccess(res, { statusCode: 201, message: 'Submission received', data: { submission } });
  };

  const submissions: RequestHandler = async (req, res) => {
    const items = await assignmentService.listSubmissions(
      req.params.id as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
    );
    sendSuccess(res, { message: 'Submissions', data: { items } });
  };

  const grade: RequestHandler = async (req, res) => {
    const input = getValidated<{ grade: number; feedback?: string }>(req, 'body');
    const submission = await assignmentService.grade(
      req.params.submissionId as string,
      req.auth!.userId,
      hasAdminRole(req.auth!),
      {
        grade: input.grade,
        feedback: input.feedback ?? null,
      },
    );
    sendSuccess(res, { message: 'Submission graded', data: { submission } });
  };

  const mine: RequestHandler = async (req, res) => {
    const items = await assignmentService.listMine(req.auth!.userId);
    sendSuccess(res, { message: 'My submissions', data: { items } });
  };

  return { list, create, update, publish, remove, submit, submissions, grade, mine };
}

export const assignmentController = createAssignmentController();
export { upload };
