import type { RequestHandler } from 'express';
import { createReadStream } from 'node:fs';

import { sendSuccess } from '../../shared/http/response.js';
import { getValidated } from '../../middlewares/validate.js';
import { lessonService } from './lesson.service.js';

export function createLessonController() {
  const list: RequestHandler = async (req, res) => {
    const lessons = await lessonService.list(req.params.courseId as string);
    sendSuccess(res, { message: 'Lessons', data: { items: lessons } });
  };

  const create: RequestHandler = async (req, res) => {
    const input = getValidated<{
      title: string;
      type: 'video' | 'text' | 'pdf' | 'resource';
      sectionId?: string;
      content?: string;
      assetKey?: string;
      durationSeconds?: number;
      isPreview?: boolean;
    }>(req, 'body');

    const lesson = await lessonService.create({
      courseId: req.params.courseId as string,
      title: input.title,
      type: input.type,
      sectionId: input.sectionId ?? null,
      content: input.content ?? null,
      assetKey: input.assetKey ?? null,
      durationSeconds: input.durationSeconds ?? null,
      isPreview: input.isPreview,
      actorId: req.auth!.userId,
      isAdmin: false,
    });

    sendSuccess(res, { statusCode: 201, message: 'Lesson created', data: { lesson } });
  };

  const update: RequestHandler = async (req, res) => {
    const input = getValidated<Record<string, unknown>>(req, 'body');
    const lesson = await lessonService.update(
      req.params.id as string,
      req.auth!.userId,
      false,
      input,
    );
    sendSuccess(res, { message: 'Lesson updated', data: { lesson } });
  };

  const remove: RequestHandler = async (req, res) => {
    await lessonService.delete(req.params.id as string, req.auth!.userId, false);
    sendSuccess(res, { message: 'Lesson deleted', data: {} });
  };

  const reorder: RequestHandler = async (req, res) => {
    const input = getValidated<{ orderedIds: string[] }>(req, 'body');
    const lessons = await lessonService.reorder(
      req.params.courseId as string,
      input.orderedIds,
      req.auth!.userId,
      false,
    );
    sendSuccess(res, { message: 'Lessons reordered', data: { items: lessons } });
  };

  const complete: RequestHandler = async (req, res) => {
    const result = await lessonService.complete(req.params.id as string, req.auth!.userId);
    sendSuccess(res, { message: 'Lesson completed', data: result });
  };

  const asset: RequestHandler = async (req, res) => {
    const asset = await lessonService.getAsset(
      req.params.id as string,
      req.auth?.userId ?? null,
      false,
    );
    const stream = createReadStream(asset.path);
    stream.on('error', () => {
      res.status(404).end();
    });
    res.type('application/octet-stream');
    stream.pipe(res);
  };

  return { list, create, update, remove, reorder, complete, asset };
}

export const lessonController = createLessonController();
