import slugify from 'slugify';

import { AppError } from '../../shared/errors/app-error.js';
import { escapeRegExp } from '../../shared/query/filtering.js';
import { CourseRepository, SectionRepository } from './course.repository.js';
import { toCourseRecord } from './course.model.js';
import { toSectionRecord } from './section.model.js';

export class CourseService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly sections: SectionRepository,
  ) {}

  async listPublic(input: {
    page: number;
    limit: number;
    sort: 'newest' | 'title';
    search?: string | undefined;
    categoryId?: string | undefined;
    tag?: string | undefined;
    freeOnly?: boolean | undefined;
  }) {
    const filter: Record<string, unknown> = { status: 'published' };

    if (input.search !== undefined && input.search.trim() !== '') {
      const regex = new RegExp(escapeRegExp(input.search.trim()), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
    }

    if (input.categoryId !== undefined) {
      filter.category = input.categoryId;
    }

    if (input.tag !== undefined) {
      filter.tags = input.tag;
    }

    if (input.freeOnly === true) {
      filter.priceCents = 0;
    }

    const sort = input.sort === 'title' ? { title: 1 as const } : { createdAt: -1 as const };

    const result = await this.courses.list(filter, sort, input.page, input.limit);

    return {
      items: result.items.map(toCourseRecord),
      total: result.total,
    };
  }

  async findById(id: string) {
    const course = await this.courses.findById(id);
    return course === null ? null : toCourseRecord(course);
  }

  async getAnalytics(instructorId?: string) {
    return this.courses.analyticsCounts(instructorId);
  }

  async listByIds(ids: readonly string[]) {
    const courses = await this.courses.findByIds(ids);
    return courses.map(toCourseRecord);
  }

  async getPublic(idOrSlug: string) {
    const course =
      (await this.courses.findById(idOrSlug)) ?? (await this.courses.findBySlug(idOrSlug));

    if (course === null || course.status !== 'published') {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toCourseRecord(course);
  }

  async listMine(instructorId: string) {
    const result = await this.courses.list({ instructor: instructorId }, { createdAt: -1 }, 1, 100);
    return result.items.map(toCourseRecord);
  }

  async create(input: {
    title: string;
    description: string;
    shortDescription?: string | null;
    instructorId: string;
    categoryId?: string | null;
    tags?: string[] | undefined;
    prerequisiteIds?: string[] | undefined;
    priceCents?: number | undefined;
    currency?: string | undefined;
  }) {
    const slug = await this.uniqueSlug(input.title);

    const document = await this.courses.create({
      title: input.title,
      slug,
      description: input.description,
      shortDescription: input.shortDescription ?? null,
      instructorId: input.instructorId,
      categoryId: input.categoryId ?? null,
      tags: input.tags ?? [],
      prerequisiteIds: input.prerequisiteIds ?? [],
      priceCents: input.priceCents ?? 0,
      currency: input.currency ?? 'USD',
    });

    return toCourseRecord(document);
  }

  async update(id: string, actorId: string, isAdmin: boolean, input: Record<string, unknown>) {
    const course = await this.courses.findById(id);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    if (!isAdmin && course.status !== 'draft' && course.status !== 'submitted') {
      throw new AppError('Published or archived courses cannot be edited', {
        statusCode: 409,
        code: 'CONFLICT',
      });
    }

    const update: Record<string, unknown> = { ...input };

    if (typeof input.title === 'string') {
      update.slug = await this.uniqueSlug(input.title, id);
    }

    const document = await this.courses.update(id, update);

    if (document === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toCourseRecord(document);
  }

  async submit(id: string, actorId: string, isAdmin: boolean) {
    const course = await this.courses.findById(id);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    if (course.status !== 'draft') {
      throw new AppError('Only draft courses can be submitted', {
        statusCode: 409,
        code: 'CONFLICT',
      });
    }

    const document = await this.courses.update(id, {
      status: 'submitted',
      submittedAt: new Date(),
    });

    if (document === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toCourseRecord(document);
  }

  async publish(id: string) {
    const course = await this.courses.findById(id);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (course.status !== 'submitted') {
      throw new AppError('Course cannot be published from its current state', {
        statusCode: 409,
        code: 'CONFLICT',
      });
    }

    const document = await this.courses.update(id, {
      status: 'published',
      publishedAt: new Date(),
    });

    if (document === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toCourseRecord(document);
  }

  async archive(id: string, actorId: string, isAdmin: boolean) {
    const course = await this.courses.findById(id);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const document = await this.courses.update(id, { status: 'archived', archivedAt: new Date() });

    if (document === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toCourseRecord(document);
  }

  async delete(id: string, actorId: string, isAdmin: boolean) {
    const course = await this.courses.findById(id);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    await this.courses.delete(id);
  }

  async listSections(courseId: string) {
    return (await this.sections.listByCourse(courseId)).map(toSectionRecord);
  }

  async createSection(courseId: string, title: string, actorId: string, isAdmin: boolean) {
    const course = await this.courses.findById(courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!isAdmin && course.instructor.toString() !== actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const existing = await this.sections.listByCourse(courseId);
    const section = await this.sections.create({ courseId, title, order: existing.length });

    return toSectionRecord(section);
  }

  private async uniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true }) || 'course';
    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.courses.findBySlug(slug);

      if (existing === null || (excludeId !== undefined && existing._id.toString() === excludeId)) {
        return slug;
      }

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }
}

import { categoryRepository, categoryService } from './category.service.js';

export const courseRepository = new CourseRepository();
export const sectionRepository = new SectionRepository();
export const courseService = new CourseService(courseRepository, sectionRepository);
export const courseCategoryService = categoryService;
export { categoryRepository };
