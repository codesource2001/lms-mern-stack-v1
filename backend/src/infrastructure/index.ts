import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { retry } from '../shared/async/retry.js';
import { DependencyConnectionError } from './errors.js';
import { connectMongo, disconnectMongo } from './mongo/connection.js';
import { connectRedis, disconnectRedis } from './redis/connection.js';

export async function connectInfrastructure(): Promise<void> {
  try {
    await retry(connectMongo, {
      attempts: env.DEPENDENCY_RETRY_ATTEMPTS,
      delayMs: env.DEPENDENCY_RETRY_DELAY_MS,
      onRetry: (error, failedAttempt) => {
        logger.warn(
          { dependency: 'mongodb', err: error, failedAttempt },
          'MongoDB connection attempt failed; retrying',
        );
      },
    });
  } catch (error) {
    await disconnectInfrastructure();
    throw new DependencyConnectionError('mongodb', error);
  }

  try {
    await retry(connectRedis, {
      attempts: env.DEPENDENCY_RETRY_ATTEMPTS,
      delayMs: env.DEPENDENCY_RETRY_DELAY_MS,
      onRetry: (error, failedAttempt) => {
        logger.warn(
          { dependency: 'redis', err: error, failedAttempt },
          'Redis connection attempt failed; retrying',
        );
      },
    });
  } catch (error) {
    await disconnectInfrastructure();
    throw new DependencyConnectionError('redis', error);
  }
}

export async function disconnectInfrastructure(): Promise<void> {
  try {
    await disconnectRedis();
  } catch (error) {
    logger.error({ dependency: 'redis', err: error }, 'Failed to disconnect Redis');
  }

  try {
    await disconnectMongo();
  } catch (error) {
    logger.error({ dependency: 'mongodb', err: error }, 'Failed to disconnect MongoDB');
  }
}
