import { rbacService } from '../modules/rbac/rbac.service.js';

export const permissionsSeed = {
  name: 'rbac-permissions',
  async run() {
    await rbacService.syncPermissionCatalog();
  },
};
