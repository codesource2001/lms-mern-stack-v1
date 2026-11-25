import type { RequestHandler } from 'express';

import { hasAdminRole } from '../auth/auth.middleware.js';
import { getValidated } from '../../middlewares/validate.js';
import { buildPaginationMeta } from '../../shared/query/pagination.js';
import { sendSuccess } from '../../shared/http/response.js';
import { announcementService } from './announcement.service.js';

export function createAnnouncementController() {
  const create: RequestHandler = async (req, res) => {
    const input = getValidated<{ courseId: string; title: string; body: string }>(req, 'body');
    const announcement = await announcementService.create({
      courseId: input.courseId,
      actorId: req.auth!.userId,
      isAdmin: hasAdminRole(req.auth!),
      title: input.title,
      body: input.body,
    });

    sendSuccess(res, {
      statusCode: 201,
      message: 'Announcement published',
      data: { announcement },
    });
  };

  const list: RequestHandler = async (req, res) => {
    const params = getValidated<{ courseId: string }>(req, 'params');
    const query = getValidated<{ page?: number; limit?: number }>(req, 'query');
    const result = await announcementService.listForUser(
      req.auth!.userId,
      params.courseId,
      hasAdminRole(req.auth!),
      query.page ?? 1,
      query.limit ?? 20,
    );

    sendSuccess(res, {
      message: 'Announcements',
      data: { items: result.items },
      meta: buildPaginationMeta({ page: result.page, limit: result.limit }, result.total),
    });
  };

  const remove: RequestHandler = async (req, res) => {
    const params = getValidated<{ id: string }>(req, 'params');
    await announcementService.delete(params.id, req.auth!.userId, hasAdminRole(req.auth!));
    sendSuccess(res, { message: 'Announcement deleted', data: {} });
  };

  return { create, list, remove };
}

export const announcementController = createAnnouncementController();
