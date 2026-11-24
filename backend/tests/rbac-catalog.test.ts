import { describe, expect, it } from 'vitest';

import {
  ALL_PERMISSION_CODES,
  PERMISSION_CATALOG,
  ROLE_CATALOG,
} from '../src/modules/rbac/rbac.catalog.js';

describe('RBAC catalog', () => {
  it('has unique permission codes', () => {
    const codes = PERMISSION_CATALOG.map((permission) => permission.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has unique role slugs', () => {
    const slugs = ROLE_CATALOG.map((role) => role.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('references only declared permissions', () => {
    const allowed = new Set(ALL_PERMISSION_CODES);

    for (const role of ROLE_CATALOG) {
      for (const code of role.permissionCodes) {
        expect(allowed.has(code)).toBe(true);
      }
    }
  });

  it('gives the super admin every permission', () => {
    const superAdmin = ROLE_CATALOG.find((role) => role.slug === 'super_admin');
    expect(superAdmin?.permissionCodes).toHaveLength(ALL_PERMISSION_CODES.length);
  });
});
