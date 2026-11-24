import { env } from '../config/env.js';
import { checkMongo } from './mongo/connection.js';
import { checkRedis } from './redis/connection.js';
import type { ReadinessReport } from './types.js';

export async function checkReadiness(): Promise<ReadinessReport> {
  const [mongodb, redis] = await Promise.all([
    checkMongo(env.READINESS_TIMEOUT_MS),
    checkRedis(env.READINESS_TIMEOUT_MS),
  ]);

  return {
    status: mongodb.status === 'up' && redis.status === 'up' ? 'ready' : 'not_ready',
    checkedAt: new Date().toISOString(),
    checks: { mongodb, redis },
  };
}
