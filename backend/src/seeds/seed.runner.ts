import { performance } from 'node:perf_hooks';

import { logger } from '../config/logger.js';
import { SeedExecutionError, type SeedDefinition, type SeedResult } from './seed.types.js';

/**
 * Runs seeds sequentially in declaration order. Ordering matters because later
 * seeds may reference records created by earlier ones. A failure stops the run
 * and reports which seeds were already applied.
 */
export async function runSeeds(seeds: readonly SeedDefinition[]): Promise<SeedResult[]> {
  const applied: SeedResult[] = [];

  for (const seed of seeds) {
    const startedAt = performance.now();
    logger.info({ seed: seed.name }, 'Applying seed');

    try {
      await seed.run();
    } catch (error) {
      logger.error({ seed: seed.name, err: error }, 'Seed failed');
      throw new SeedExecutionError(seed.name, applied, error);
    }

    const result: SeedResult = {
      name: seed.name,
      durationMs: Math.round(performance.now() - startedAt),
    };

    applied.push(result);
    logger.info({ seed: seed.name, durationMs: result.durationMs }, 'Seed applied');
  }

  return applied;
}
