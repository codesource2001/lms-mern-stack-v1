import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { getRedisClient } from '../redis/connection.js';
import { RedisJobStore } from './redis-job.store.js';
import type { JobStore } from './job.types.js';

let defaultStore: JobStore | null = null;

export function getJobStore(): JobStore {
  defaultStore ??= new RedisJobStore(getRedisClient);
  return defaultStore;
}

export interface EnqueueInput {
  type: string;
  payload?: Record<string, unknown>;
  jobId?: string;
  runAt?: Date;
  maxAttempts?: number;
}

export interface EnqueueResult {
  id: string;
  created: boolean;
}

export class JobQueue {
  constructor(private readonly store: JobStore) {}

  async enqueue(input: EnqueueInput): Promise<EnqueueResult> {
    const id = input.jobId ?? randomUUID();
    const created = await this.store.enqueue({
      id,
      type: input.type,
      payload: input.payload ?? {},
      runAt: input.runAt ?? new Date(),
      maxAttempts: input.maxAttempts ?? env.JOBS_MAX_ATTEMPTS,
    });

    return { id, created };
  }
}

export const jobQueue = new JobQueue(getJobStore());
