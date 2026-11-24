import type { SeedDefinition } from './seed.types.js';

import { permissionsSeed } from './permissions.seed.js';
import { rolesSeed } from './roles.seed.js';

/**
 * Role and permission seed data is introduced in Phase 3. Seeds run in
 * dependency order: permissions first, then roles.
 */
export const seeds: readonly SeedDefinition[] = [
  { name: permissionsSeed.name, run: () => permissionsSeed.run() },
  { name: rolesSeed.name, run: () => rolesSeed.run() },
];
