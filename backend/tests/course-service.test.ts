/* eslint-disable */
import { describe, expect, it } from 'vitest';

import { CourseService } from '../src/modules/courses/course.service.js';

function makeRepositories() {
  const courses = new Map<string, any>();

  const courseRepository = {
    async findById(id: string) {
      return courses.get(id) ?? null;
    },
    async findBySlug(slug: string) {
      return [...courses.values()].find((course) => course.slug === slug) ?? null;
    },
    async list(filter: any, _sort: any, _page: number, _limit: number) {
      let items = [...courses.values()].filter((course) => {
        if (filter.status !== undefined && course.status !== filter.status) {
          return false;
        }
        return true;
      });
      return { items, total: items.length };
    },
    async create(input: any) {
      const course = {
        _id: { toString: () => input.slug },
        title: input.title,
        slug: input.slug,
        description: input.description,
        shortDescription: input.shortDescription,
        instructor: { toString: () => input.instructorId },
        category: input.categoryId === null ? null : { toString: () => input.categoryId },
        tags: input.tags,
        prerequisites: input.prerequisiteIds.map((id: string) => ({ toString: () => id })),
        thumbnailKey: null,
        bannerKey: null,
        priceCents: input.priceCents,
        currency: input.currency,
        status: 'draft',
        submittedAt: null,
        publishedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      courses.set(input.slug, course);
      return course;
    },
    async update(id: string, input: any) {
      const course = courses.get(id);
      if (course === undefined) {
        return null;
      }
      Object.assign(course, input);
      if (input.status !== undefined) {
        course.status = input.status;
      }
      return course;
    },
    async delete(id: string) {
      courses.delete(id);
    },
  };

  const sectionRepository = {
    async listByCourse() {
      return [];
    },
    async create(input: any) {
      const section = {
        _id: { toString: () => 'section-1' },
        course: { toString: () => input.courseId },
        title: input.title,
        order: input.order,
        toObject: () => ({}),
      };
      return section;
    },
  };

  return { courseRepository, sectionRepository, courses };
}

describe('CourseService', () => {
  it('creates a draft course', async () => {
    const { courseRepository, sectionRepository } = makeRepositories();
    const service = new CourseService(courseRepository as any, sectionRepository as any);

    const course = await service.create({
      title: 'Intro to Testing',
      description: 'A course about testing things thoroughly.',
      instructorId: 'instructor-1',
    });

    expect(course.status).toBe('draft');
    expect(course.slug).toBe('intro-to-testing');
  });

  it('prevents non-owners from updating a course', async () => {
    const { courseRepository, sectionRepository } = makeRepositories();
    const service = new CourseService(courseRepository as any, sectionRepository as any);

    const course = await service.create({
      title: 'Owned Course',
      description: 'A course owned by instructor one.',
      instructorId: 'instructor-1',
    });

    await expect(
      service.update(course.id, 'instructor-2', false, { title: 'Hijacked' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('requires submission before publishing', async () => {
    const { courseRepository, sectionRepository } = makeRepositories();
    const service = new CourseService(courseRepository as any, sectionRepository as any);

    const course = await service.create({
      title: 'Draft Course',
      description: 'A draft course that is not submitted.',
      instructorId: 'instructor-1',
    });

    await expect(service.publish(course.id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('publishes a submitted course', async () => {
    const { courseRepository, sectionRepository } = makeRepositories();
    const service = new CourseService(courseRepository as any, sectionRepository as any);

    const course = await service.create({
      title: 'Submitted Course',
      description: 'A submitted course ready for approval.',
      instructorId: 'instructor-1',
    });

    await service.submit(course.id, 'instructor-1', false);
    const published = await service.publish(course.id);

    expect(published.status).toBe('published');
  });

  it('archives a course', async () => {
    const { courseRepository, sectionRepository } = makeRepositories();
    const service = new CourseService(courseRepository as any, sectionRepository as any);

    const course = await service.create({
      title: 'Archivable Course',
      description: 'A course that will be archived.',
      instructorId: 'instructor-1',
    });

    await service.submit(course.id, 'instructor-1', false);
    await service.publish(course.id);
    const archived = await service.archive(course.id, 'instructor-1', false);

    expect(archived.status).toBe('archived');
  });
});
