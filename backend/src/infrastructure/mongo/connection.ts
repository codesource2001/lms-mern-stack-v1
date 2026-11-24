import { performance } from 'node:perf_hooks';

import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { withTimeout } from '../../shared/async/with-timeout.js';
import type { DependencyCheck } from '../types.js';

let lifecycleEventsBound = false;

function bindLifecycleEvents(): void {
  if (lifecycleEventsBound) {
    return;
  }

  lifecycleEventsBound = true;

  mongoose.connection.on('connected', () => {
    logger.info({ dependency: 'mongodb' }, 'MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn({ dependency: 'mongodb' }, 'MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info({ dependency: 'mongodb' }, 'MongoDB reconnected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error({ dependency: 'mongodb', err: error }, 'MongoDB connection error');
  });
}

export async function connectMongo(): Promise<void> {
  bindLifecycleEvents();

  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return;
  }

  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    autoIndex: env.NODE_ENV !== 'production',
  });
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) {
    return;
  }

  await mongoose.disconnect();
}

export async function checkMongo(timeoutMs: number): Promise<DependencyCheck> {
  const startedAt = performance.now();

  if (
    mongoose.connection.readyState !== mongoose.ConnectionStates.connected ||
    !mongoose.connection.db
  ) {
    return { status: 'down', latencyMs: 0 };
  }

  try {
    await withTimeout(mongoose.connection.db.admin().ping(), timeoutMs, 'MongoDB readiness check');

    return {
      status: 'up',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    logger.debug({ dependency: 'mongodb', err: error }, 'MongoDB readiness check failed');

    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}
