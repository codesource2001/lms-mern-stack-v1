import { PERMISSION_CATALOG, ROLE_CATALOG } from './rbac.catalog.js';
import { PermissionRepository, RoleRepository } from './rbac.repository.js';
import type { RbacService as RbacServiceContract } from './rbac.types.js';
import type { RoleRecord } from './role.model.js';

export class RbacService implements RbacServiceContract {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async getRoleBySlug(slug: string): Promise<RoleRecord | null> {
    const role = await this.roleRepository.findBySlug(slug);

    if (role === null) {
      return null;
    }

    const permissions = await this.permissionRepository.findByIds(role.permissionIds);

    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      rank: role.rank,
      isSystem: role.isSystem,
      permissionCodes: permissions.map((permission) => permission.code),
    };
  }

  async getAccessForRoles(roleIds: readonly string[]): Promise<{
    roles: Array<{ slug: string; name: string }>;
    permissions: string[];
  }> {
    const roles = await this.roleRepository.findByIds(roleIds);

    if (roles.length === 0) {
      return { roles: [], permissions: [] };
    }

    const permissionIds = roles.flatMap((role) => role.permissionIds);
    const permissions = await this.permissionRepository.findByIds(permissionIds);
    const permissionCodeSet = new Set(permissions.map((permission) => permission.code));

    return {
      roles: roles.map((role) => ({ slug: role.slug, name: role.name })),
      permissions: [...permissionCodeSet].sort(),
    };
  }

  async syncPermissionCatalog(): Promise<void> {
    for (const definition of PERMISSION_CATALOG) {
      await this.permissionRepository.upsert(definition.code, {
        description: definition.description,
        group: definition.group,
        isSystem: true,
      });
    }
  }

  async syncSystemRoles(): Promise<void> {
    await this.syncPermissionCatalog();

    const permissions = await this.permissionRepository.findAll();
    const permissionIdByCode = new Map(
      permissions.map((permission) => [permission.code, permission.id]),
    );

    for (const definition of ROLE_CATALOG) {
      const permissionIds = definition.permissionCodes
        .map((code) => permissionIdByCode.get(code))
        .filter((id): id is string => id !== undefined);

      await this.roleRepository.upsertBySlug(definition.slug, {
        name: definition.name,
        description: definition.description,
        rank: definition.rank,
        isSystem: definition.isSystem,
        permissionIds,
      });
    }
  }
}

export const rbacRepository = {
  permissions: new PermissionRepository(),
  roles: new RoleRepository(),
};

export const rbacService = new RbacService(rbacRepository.permissions, rbacRepository.roles);
