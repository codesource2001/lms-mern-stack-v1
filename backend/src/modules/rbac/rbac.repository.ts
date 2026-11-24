import type { Types } from 'mongoose';

import { PermissionModel, type PermissionDocument } from './permission.model.js';
import { RoleModel, type RoleDocument } from './role.model.js';

interface PermissionRepositoryRecord {
  id: string;
  code: string;
  description: string;
  group: string;
  isSystem: boolean;
}

interface RoleRepositoryRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  rank: number;
  isSystem: boolean;
  permissionIds: string[];
}

export class PermissionRepository {
  async findByCode(code: string): Promise<PermissionRepositoryRecord | null> {
    const document = await PermissionModel.findOne({ code: code.toLowerCase().trim() }).lean();
    return document === null ? null : mapPermission(document);
  }

  async findByCodes(codes: readonly string[]): Promise<PermissionRepositoryRecord[]> {
    if (codes.length === 0) {
      return [];
    }

    const documents = await PermissionModel.find({ code: { $in: [...codes] } }).lean();
    return documents.map(mapPermission);
  }

  async findByIds(ids: readonly string[]): Promise<PermissionRepositoryRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    const documents = await PermissionModel.find({ _id: { $in: ids } }).lean();
    return documents.map(mapPermission);
  }

  async findAll(): Promise<PermissionRepositoryRecord[]> {
    const documents = await PermissionModel.find().lean();
    return documents.map(mapPermission);
  }

  async upsert(
    code: string,
    input: { description: string; group: string; isSystem: boolean },
  ): Promise<PermissionRepositoryRecord> {
    const document = await PermissionModel.findOneAndUpdate(
      { code },
      {
        $set: {
          code,
          description: input.description,
          group: input.group,
          isSystem: input.isSystem,
        },
      },
      { returnDocument: 'after', upsert: true, runValidators: true },
    ).lean();

    return mapPermission(document);
  }
}

export class RoleRepository {
  async findBySlug(slug: string): Promise<RoleRepositoryRecord | null> {
    const document = await RoleModel.findOne({ slug }).lean();
    return document === null ? null : mapRole(document);
  }

  async findByIds(ids: readonly string[]): Promise<RoleRepositoryRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    const documents = await RoleModel.find({ _id: { $in: ids } }).lean();
    return (documents as Array<RoleDocument & { _id: Types.ObjectId }>).map(mapRole);
  }

  async upsertBySlug(
    slug: string,
    input: {
      name: string;
      description: string;
      rank: number;
      isSystem: boolean;
      permissionIds: readonly string[];
    },
  ): Promise<RoleRepositoryRecord> {
    const document = await RoleModel.findOneAndUpdate(
      { slug },
      {
        $set: {
          slug,
          name: input.name,
          description: input.description,
          rank: input.rank,
          isSystem: input.isSystem,
          permissions: input.permissionIds,
        },
      },
      { returnDocument: 'after', upsert: true, runValidators: true },
    ).lean();

    return mapRole(document);
  }
}

function mapPermission(
  document: PermissionDocument & { _id: Types.ObjectId },
): PermissionRepositoryRecord {
  return {
    id: document._id.toString(),
    code: document.code,
    description: document.description,
    group: document.group,
    isSystem: document.isSystem,
  };
}

function mapRole(document: RoleDocument & { _id: Types.ObjectId }): RoleRepositoryRecord {
  return {
    id: document._id.toString(),
    slug: document.slug,
    name: document.name,
    description: document.description,
    rank: document.rank,
    isSystem: document.isSystem,
    permissionIds: (document.permissions ?? []).map((id) => id.toString()),
  };
}
