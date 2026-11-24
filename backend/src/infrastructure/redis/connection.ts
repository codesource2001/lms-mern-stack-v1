import { performance } from 'node:perf_hooks';

import { createClient, type RedisClientType } from 'redis';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { withTimeout } from '../../shared/async/with-timeout.js';
import type { DependencyCheck } from '../types.js';

let client: RedisClientType | null = null;

function createRedisClient(): RedisClientType {
  const redis = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
      /*
       * Keep retrying with capped backoff after a runtime outage. Startup is
       * bounded separately by connectRedis(), so an unreachable Redis cannot
       * hang process boot even though the client itself retries indefinitely.
       */
      reconnectStrategy: (retries) => Math.min(Math.max(retries, 1) * 250, 5_000),
    },
  });

  redis.on('ready', () => {
    logger.info({ dependency: 'redis' }, 'Redis connected');
  });

  redis.on('end', () => {
    logger.warn({ dependency: 'redis' }, 'Redis connection closed');
  });

  redis.on('error', (error) => {
    logger.error({ dependency: 'redis', err: error }, 'Redis connection error');
  });

  return redis;
}

export async function connectRedis(): Promise<void> {
  if (client?.isReady) {
    return;
  }

  if (client?.isOpen) {
    client.destroy();
    client = null;
  }

  const redis = createRedisClient();
  client = redis;

  try {
    await withTimeout(redis.connect(), env.REDIS_CONNECT_TIMEOUT_MS, 'Redis startup connection');
  } catch (error) {
    redis.destroy();
    client = null;
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!client) {
    return;
  }

  const redis = client;
  client = null;

  if (!redis.isOpen) {
    redis.destroy();
    return;
  }

  try {
    await redis.quit();
  } catch (error) {
    logger.warn({ dependency: 'redis', err: error }, 'Redis quit failed; destroying client');
    redis.destroy();
  }
}

export async function checkRedis(timeoutMs: number): Promise<DependencyCheck> {
  const startedAt = performance.now();

  if (!client?.isReady) {
    return { status: 'down', latencyMs: 0 };
  }

  try {
    await withTimeout(client.ping(), timeoutMs, 'Redis readiness check');

    return {
      status: 'up',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    logger.debug({ dependency: 'redis', err: error }, 'Redis readiness check failed');

    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}
