import type { Request, RequestHandler } from 'express';
import multer from 'multer';

import { sendSuccess } from '../../shared/http/response.js';
import { getValidated } from '../../middlewares/validate.js';
import { buildPaginationMeta } from '../../shared/query/pagination.js';
import { storageProvider } from '../../infrastructure/storage/storage.service.js';
import { courseService } from './course.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export function createCourseController() {
  const list: RequestHandler = async (_req, res) => {
    const query = getValidated<{
      page: number;
      limit: number;
      sort: { field: 'createdAt' | 'title'; direction: 1 | -1 };
      q?: string;
      category?: string;
      tag?: string;
      free?: boolean;
    }>(_req, 'query');

    const result = await courseService.listPublic({
      page: query.page,
      limit: query.limit,
      sort: query.sort.field === 'title' ? 'title' : 'newest',
      search: query.q,
      categoryId: query.category,
      tag: query.tag,
      freeOnly: query.free,
    });

    sendSuccess(res, {
      message: 'Courses',
      data: { items: result.items },
      meta: buildPaginationMeta({ page: query.page, limit: query.limit }, result.total),
    });
  };

  const get: RequestHandler = async (req, res) => {
    const course = await courseService.getPublic(req.params.id as string);
    sendSuccess(res, { message: 'Course', data: { course } });
  };

  const mine: RequestHandler = async (req, res) => {
    const courses = await courseService.listMine(req.auth!.userId);
    sendSuccess(res, { message: 'My courses', data: { items: courses } });
  };

  const create: RequestHandler = async (req, res) => {
    const input = getValidated<{
      title: string;
      description: string;
      shortDescription?: string;
      categoryId?: string;
      tags?: string[];
      prerequisiteIds?: string[];
      priceCents?: number;
      currency?: string;
    }>(req, 'body');

    const course = await courseService.create({
      title: input.title,
      description: input.description,
      shortDescription: input.shortDescription ?? null,
      instructorId: req.auth!.userId,
      categoryId: input.categoryId ?? null,
      tags: input.tags,
      prerequisiteIds: input.prerequisiteIds,
      priceCents: input.priceCents,
      currency: input.currency,
    });

    sendSuccess(res, { statusCode: 201, message: 'Course created', data: { course } });
  };

  const update: RequestHandler = async (req, res) => {
    const input = getValidated<Record<string, unknown>>(req, 'body');
    const course = await courseService.update(
      req.params.id as string,
      req.auth!.userId,
      false,
      input,
    );
    sendSuccess(res, { message: 'Course updated', data: { course } });
  };

  const submit: RequestHandler = async (req, res) => {
    const course = await courseService.submit(req.params.id as string, req.auth!.userId, false);
    sendSuccess(res, { message: 'Course submitted', data: { course } });
  };

  const publish: RequestHandler = async (req, res) => {
    const course = await courseService.publish(req.params.id as string);
    sendSuccess(res, { message: 'Course published', data: { course } });
  };

  const archive: RequestHandler = async (req, res) => {
    const course = await courseService.archive(req.params.id as string, req.auth!.userId, false);
    sendSuccess(res, { message: 'Course archived', data: { course } });
  };

  const remove: RequestHandler = async (req, res) => {
    await courseService.delete(req.params.id as string, req.auth!.userId, false);
    sendSuccess(res, { message: 'Course deleted', data: {} });
  };

  const sections: RequestHandler = async (req, res) => {
    const items = await courseService.listSections(req.params.id as string);
    sendSuccess(res, { message: 'Sections', data: { items } });
  };

  const createSection: RequestHandler = async (req, res) => {
    const input = getValidated<{ title: string }>(req, 'body');
    const section = await courseService.createSection(
      req.params.id as string,
      input.title,
      req.auth!.userId,
      false,
    );
    sendSuccess(res, { statusCode: 201, message: 'Section created', data: { section } });
  };

  const uploadThumbnail: RequestHandler = async (req, res) => {
    const file = (
      req as Request & { file?: { buffer: Buffer; mimetype: string; originalname: string } }
    ).file;

    if (file === undefined) {
      res.status(400).json({ success: false, message: 'File is required', code: 'BAD_REQUEST' });
      return;
    }

    const stored = await storageProvider.save({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      maxSizeBytes: 5 * 1024 * 1024,
    });

    const course = await courseService.update(req.params.id as string, req.auth!.userId, false, {
      thumbnailKey: stored.key,
    });

    sendSuccess(res, { message: 'Thumbnail uploaded', data: { course, file: stored } });
  };

  return {
    list,
    get,
    mine,
    create,
    update,
    submit,
    publish,
    archive,
    remove,
    sections,
    createSection,
    uploadThumbnail,
  };
}

export const courseController = createCourseController();
export { upload };
