import type { RequestHandler } from 'express';

import { getValidated } from '../../middlewares/validate.js';
import { buildPaginationMeta } from '../../shared/query/pagination.js';
import { sendSuccess } from '../../shared/http/response.js';
import { notificationService } from './notification.service.js';

export function createNotificationController() {
  const list: RequestHandler = async (req, res) => {
    const query = getValidated<{
      unreadOnly?: boolean;
      page?: number;
      limit?: number;
    }>(req, 'query');
    const result = await notificationService.list(req.auth!.userId, query);

    sendSuccess(res, {
      message: 'Notifications',
      data: { items: result.items },
      meta: buildPaginationMeta({ page: result.page, limit: result.limit }, result.total),
    });
  };

  const unreadCount: RequestHandler = async (req, res) => {
    const count = await notificationService.countUnread(req.auth!.userId);
    sendSuccess(res, { message: 'Unread notification count', data: { count } });
  };

  const markRead: RequestHandler = async (req, res) => {
    const params = getValidated<{ id: string }>(req, 'params');
    const notification = await notificationService.markRead(params.id, req.auth!.userId);
    sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
  };

  const markAllRead: RequestHandler = async (req, res) => {
    const updated = await notificationService.markAllRead(req.auth!.userId);
    sendSuccess(res, { message: 'Notifications marked as read', data: { updated } });
  };

  const getPreferences: RequestHandler = async (req, res) => {
    const preferences = await notificationService.getPreferences(req.auth!.userId);
    sendSuccess(res, { message: 'Notification preferences', data: { preferences } });
  };

  const updatePreferences: RequestHandler = async (req, res) => {
    const input = getValidated<Parameters<typeof notificationService.updatePreferences>[1]>(
      req,
      'body',
    );
    const preferences = await notificationService.updatePreferences(req.auth!.userId, input);
    sendSuccess(res, { message: 'Notification preferences updated', data: { preferences } });
  };

  return { list, unreadCount, markRead, markAllRead, getPreferences, updatePreferences };
}

export const notificationController = createNotificationController();
