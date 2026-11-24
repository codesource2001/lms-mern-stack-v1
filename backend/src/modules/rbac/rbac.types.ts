import type { PermissionRecord } from './permission.model.js';
import type { RoleRecord } from './role.model.js';

export interface RbacService {
  getRoleBySlug(slug: string): Promise<RoleRecord | null>;
  getAccessForRoles(roleIds: readonly string[]): Promise<{
    roles: Array<{ slug: string; name: string }>;
    permissions: string[];
  }>;
  syncPermissionCatalog(): Promise<void>;
  syncSystemRoles(): Promise<void>;
}

export type { PermissionRecord, RoleRecord };
