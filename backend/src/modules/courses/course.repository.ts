import { Types } from 'mongoose';

import { CategoryModel, type CategoryDocument } from './category.model.js';
import { CourseModel, type CourseDocument } from './course.model.js';
import { SectionModel, type SectionDocument } from './section.model.js';

export class CategoryRepository {
  async list(): Promise<Array<CategoryDocument & { _id: Types.ObjectId }>> {
    return CategoryModel.find().sort({ name: 1 }).lean();
  }

  async findById(id: string) {
    return CategoryModel.findById(id).lean() as Promise<
      (CategoryDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async findBySlug(slug: string) {
    return CategoryModel.findOne({ slug }).lean() as Promise<
      (CategoryDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async create(input: {
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
  }) {
    return CategoryModel.create({
      name: input.name,
      slug: input.slug,
      description: input.description,
      parent: input.parentId === null ? null : new Types.ObjectId(input.parentId),
    });
  }

  async update(
    id: string,
    input: { name?: string; slug?: string; description?: string | null; parentId?: string | null },
  ) {
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.slug !== undefined) update.slug = input.slug;
    if (input.description !== undefined) update.description = input.description;
    if (input.parentId !== undefined) {
      update.parent = input.parentId === null ? null : new Types.ObjectId(input.parentId);
    }

    return CategoryModel.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: 'after', runValidators: true },
    ).lean() as Promise<(CategoryDocument & { _id: Types.ObjectId }) | null>;
  }

  async delete(id: string) {
    await CategoryModel.deleteOne({ _id: id });
  }

  async hasChildren(id: string) {
    return (await CategoryModel.countDocuments({ parent: new Types.ObjectId(id) })) > 0;
  }
}

export class CourseRepository {
  async list(
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    page: number,
    limit: number,
  ) {
    const [documents, total] = await Promise.all([
      CourseModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CourseModel.countDocuments(filter),
    ]);

    return {
      items: documents as Array<CourseDocument & { _id: Types.ObjectId }>,
      total,
    };
  }

  async findById(id: string) {
    return CourseModel.findById(id).lean() as Promise<
      (CourseDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async findBySlug(slug: string) {
    return CourseModel.findOne({ slug }).lean() as Promise<
      (CourseDocument & { _id: Types.ObjectId }) | null
    >;
  }

  async create(input: {
    title: string;
    slug: string;
    description: string;
    shortDescription: string | null;
    instructorId: string;
    categoryId: string | null;
    tags: string[];
    prerequisiteIds: string[];
    priceCents: number;
    currency: string;
  }) {
    return CourseModel.create({
      title: input.title,
      slug: input.slug,
      description: input.description,
      shortDescription: input.shortDescription,
      instructor: new Types.ObjectId(input.instructorId),
      category: input.categoryId === null ? null : new Types.ObjectId(input.categoryId),
      tags: input.tags,
      prerequisites: input.prerequisiteIds.map((id) => new Types.ObjectId(id)),
      priceCents: input.priceCents,
      currency: input.currency,
    });
  }

  async update(id: string, input: Record<string, unknown>) {
    const update: Record<string, unknown> = { ...input };

    if (typeof update.categoryId === 'string') {
      update.category = new Types.ObjectId(update.categoryId);
      delete update.categoryId;
    }

    if (Array.isArray(update.prerequisiteIds)) {
      update.prerequisites = (update.prerequisiteIds as string[]).map(
        (id) => new Types.ObjectId(id),
      );
      delete update.prerequisiteIds;
    }

    if (typeof update.instructorId === 'string') {
      update.instructor = new Types.ObjectId(update.instructorId);
      delete update.instructorId;
    }

    return CourseModel.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: 'after', runValidators: true },
    ).lean() as Promise<(CourseDocument & { _id: Types.ObjectId }) | null>;
  }

  async delete(id: string) {
    await CourseModel.deleteOne({ _id: id });
  }
}

export class SectionRepository {
  async listByCourse(courseId: string) {
    return SectionModel.find({ course: new Types.ObjectId(courseId) })
      .sort({ order: 1 })
      .lean() as Promise<Array<SectionDocument & { _id: Types.ObjectId }>>;
  }

  async create(input: { courseId: string; title: string; order: number }) {
    return SectionModel.create({
      course: new Types.ObjectId(input.courseId),
      title: input.title,
      order: input.order,
    });
  }

  async update(id: string, input: { title?: string; order?: number }) {
    return SectionModel.findByIdAndUpdate(
      id,
      { $set: input },
      { returnDocument: 'after', runValidators: true },
    ).lean() as Promise<(SectionDocument & { _id: Types.ObjectId }) | null>;
  }

  async delete(id: string) {
    await SectionModel.deleteOne({ _id: id });
  }
}
