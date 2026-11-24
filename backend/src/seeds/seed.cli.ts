import { logger } from '../config/logger.js';
import { connectMongo, disconnectMongo } from '../infrastructure/mongo/connection.js';
import { seeds } from './seed.registry.js';
import { runSeeds } from './seed.runner.js';

async function main(): Promise<void> {
  await connectMongo();

  try {
    if (seeds.length === 0) {
      logger.warn('No seeders are registered. Role and permission data is introduced in Phase 3.');
      return;
    }

    const results = await runSeeds(seeds);
    logger.info({ applied: results.length }, 'Seed run complete');
  } finally {
    await disconnectMongo();
  }
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Seed run failed');
  process.exitCode = 1;
});
