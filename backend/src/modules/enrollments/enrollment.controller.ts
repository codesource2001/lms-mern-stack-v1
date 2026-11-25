import type { RequestHandler } from 'express';

import { sendSuccess } from '../../shared/http/response.js';
import { getValidated } from '../../middlewares/validate.js';
import { enrollmentService } from './enrollment.service.js';

export function createEnrollmentController() {
  const enroll: RequestHandler = async (req, res) => {
    const input = getValidated<{ courseId: string }>(req, 'body');
    const enrollment = await enrollmentService.enroll(req.auth!.userId, input.courseId);
    sendSuccess(res, { statusCode: 201, message: 'Enrolled', data: { enrollment } });
  };

  const mine: RequestHandler = async (req, res) => {
    const items = await enrollmentService.listMine(req.auth!.userId);
    sendSuccess(res, { message: 'My learning', data: { items } });
  };

  const revoke: RequestHandler = async (req, res) => {
    const enrollment = await enrollmentService.revoke(req.params.id as string);
    sendSuccess(res, { message: 'Enrollment revoked', data: { enrollment } });
  };

  const activate: RequestHandler = async (req, res) => {
    const enrollment = await enrollmentService.activate(req.params.id as string);
    sendSuccess(res, { message: 'Enrollment activated', data: { enrollment } });
  };

  return { enroll, mine, revoke, activate };
}

export const enrollmentController = createEnrollmentController();
