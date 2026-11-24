import { describe, expect, it } from 'vitest';

import { runSeeds } from '../src/seeds/seed.runner.js';
import { SeedExecutionError, type SeedDefinition } from '../src/seeds/seed.types.js';

describe('seed runner', () => {
  it('runs seeders sequentially in declaration order', async () => {
    const order: string[] = [];
    const seeds: SeedDefinition[] = [
      {
        name: 'permissions',
        run: () => Promise.resolve(order.push('permissions')).then(() => undefined),
      },
      { name: 'roles', run: () => Promise.resolve(order.push('roles')).then(() => undefined) },
    ];

    const results = await runSeeds(seeds);

    expect(order).toEqual(['permissions', 'roles']);
    expect(results.map((result) => result.name)).toEqual(['permissions', 'roles']);
    expect(results.every((result) => result.durationMs >= 0)).toBe(true);
  });

  it('stops at the first failure and reports applied seeds', async () => {
    const applied: string[] = [];
    const seeds: SeedDefinition[] = [
      {
        name: 'permissions',
        run: () => {
          applied.push('permissions');
          return Promise.resolve();
        },
      },
      {
        name: 'roles',
        run: () => Promise.reject(new Error('duplicate role key')),
      },
      {
        name: 'users',
        run: () => {
          applied.push('users');
          return Promise.resolve();
        },
      },
    ];

    const error: unknown = await runSeeds(seeds).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SeedExecutionError);
    if (!(error instanceof SeedExecutionError)) {
      throw error;
    }

    expect(error.seedName).toBe('roles');
    expect(error.applied.map((result) => result.name)).toEqual(['permissions']);
    expect(applied).toEqual(['permissions']);
    expect(error.cause).toBeInstanceOf(Error);
  });
});
