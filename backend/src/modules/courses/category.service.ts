import slugify from 'slugify';

import { AppError } from '../../shared/errors/app-error.js';
import { CategoryRepository } from './course.repository.js';
import { toCategoryRecord } from './category.model.js';

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async list() {
    const categories = await this.repository.list();
    return categories.map(toCategoryRecord);
  }

  async create(input: { name: string; description?: string | null; parentId?: string | null }) {
    const slug = slugify(input.name, { lower: true, strict: true });
    const existing = await this.repository.findBySlug(slug);

    if (existing !== null) {
      throw new AppError('Category already exists', { statusCode: 409, code: 'CONFLICT' });
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      const parent = await this.repository.findById(input.parentId);

      if (parent === null) {
        throw new AppError('Parent category not found', { statusCode: 404, code: 'NOT_FOUND' });
      }
    }

    const document = await this.repository.create({
      name: input.name,
      slug,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
    });

    return toCategoryRecord(document);
  }

  async update(
    id: string,
    input: { name?: string; description?: string | null; parentId?: string | null },
  ) {
    const category = await this.repository.findById(id);

    if (category === null) {
      throw new AppError('Category not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      if (input.parentId === id) {
        throw new AppError('Category cannot be its own parent', {
          statusCode: 400,
          code: 'INVALID_CATEGORY_PARENT',
        });
      }

      const parent = await this.repository.findById(input.parentId);

      if (parent === null) {
        throw new AppError('Parent category not found', { statusCode: 404, code: 'NOT_FOUND' });
      }

      const descendants = await this.descendantIds(id);

      if (descendants.includes(input.parentId)) {
        throw new AppError('Category move would create a cycle', {
          statusCode: 400,
          code: 'CATEGORY_CYCLE',
        });
      }
    }

    const update: {
      name?: string;
      slug?: string;
      description?: string | null;
      parentId?: string | null;
    } = {};

    if (input.name !== undefined) {
      update.name = input.name;
      update.slug = slugify(input.name, { lower: true, strict: true });
    }

    if (input.description !== undefined) {
      update.description = input.description;
    }

    if (input.parentId !== undefined) {
      update.parentId = input.parentId;
    }

    const document = await this.repository.update(id, update);

    if (document === null) {
      throw new AppError('Category not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toCategoryRecord(document);
  }

  async delete(id: string) {
    const category = await this.repository.findById(id);

    if (category === null) {
      throw new AppError('Category not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (await this.repository.hasChildren(id)) {
      throw new AppError('Category has child categories', { statusCode: 409, code: 'CONFLICT' });
    }

    await this.repository.delete(id);
  }

  private async descendantIds(id: string): Promise<string[]> {
    const categories = (await this.repository.list()).map(toCategoryRecord);
    const result: string[] = [];
    const queue = [id];

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const category of categories) {
        if (category.parentId === current) {
          result.push(category.id);
          queue.push(category.id);
        }
      }
    }

    return result;
  }
}

export const categoryRepository = new CategoryRepository();
export const categoryService = new CategoryService(categoryRepository);
