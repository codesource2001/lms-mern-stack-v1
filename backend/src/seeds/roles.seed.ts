import { rbacService } from '../modules/rbac/rbac.service.js';

export const rolesSeed = {
  name: 'rbac-roles',
  async run() {
    await rbacService.syncSystemRoles();
  },
};
