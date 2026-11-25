import type { RedisClientType } from 'redis';

import type { ClaimedJob, JobDefinition, JobStore } from './job.types.js';

const PREFIX = 'atrium:jobs:';
const PENDING_KEY = `${PREFIX}pending`;
const ACTIVE_KEY = `${PREFIX}active`;
const DEAD_KEY = `${PREFIX}dead`;

function jobKey(id: string): string {
  return `${PREFIX}job:${id}`;
}

const ENQUEUE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[1], 'id', ARGV[1], 'type', ARGV[2], 'payload', ARGV[3], 'runAt', ARGV[4], 'maxAttempts', ARGV[5], 'attempts', '0', 'status', 'pending', 'lastError', '')
redis.call('ZADD', KEYS[2], ARGV[4], ARGV[1])
return 1
`;

const CLAIM_SCRIPT = `
local ids = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, tonumber(ARGV[2]))
for _, id in ipairs(ids) do
  redis.call('ZREM', KEYS[1], id)
  redis.call('HINCRBY', '${PREFIX}job:' .. id, 'attempts', 1)
  redis.call('HSET', '${PREFIX}job:' .. id, 'status', 'active', 'leasedUntil', ARGV[3])
  redis.call('ZADD', KEYS[2], ARGV[3], id)
end
return ids
`;

const RECOVER_SCRIPT = `
local ids = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
for _, id in ipairs(ids) do
  redis.call('ZREM', KEYS[1], id)
  redis.call('HSET', '${PREFIX}job:' .. id, 'status', 'pending', 'leasedUntil', '0')
  redis.call('ZADD', KEYS[2], ARGV[1], id)
end
return #ids
`;

const COMPLETE_SCRIPT = `
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('HSET', '${PREFIX}job:' .. ARGV[1], 'status', 'completed', 'lastError', '')
return 1
`;

const RETRY_SCRIPT = `
redis.call('ZREM', KEYS[1], ARGV[1])
local attempts = tonumber(redis.call('HGET', '${PREFIX}job:' .. ARGV[1], 'attempts') or '0')
local maxAttempts = tonumber(redis.call('HGET', '${PREFIX}job:' .. ARGV[1], 'maxAttempts') or '3')
redis.call('HSET', '${PREFIX}job:' .. ARGV[1], 'lastError', ARGV[3])
if attempts >= maxAttempts then
  redis.call('HSET', '${PREFIX}job:' .. ARGV[1], 'status', 'dead', 'leasedUntil', '0')
  redis.call('SADD', KEYS[2], ARGV[1])
  return 'dead'
end
redis.call('HSET', '${PREFIX}job:' .. ARGV[1], 'status', 'pending', 'leasedUntil', '0')
redis.call('ZADD', KEYS[3], ARGV[2], ARGV[1])
return 'retry'
`;

const DEAD_SCRIPT = `
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('HSET', '${PREFIX}job:' .. ARGV[1], 'status', 'dead', 'lastError', ARGV[2], 'leasedUntil', '0')
redis.call('SADD', KEYS[2], ARGV[1])
return 1
`;

/** Redis-backed durable store. MongoDB remains the system of record. */
export class RedisJobStore implements JobStore {
  constructor(private readonly client: () => RedisClientType) {}

  async enqueue(job: JobDefinition): Promise<boolean> {
    const result = await this.client().eval(ENQUEUE_SCRIPT, {
      keys: [jobKey(job.id), PENDING_KEY],
      arguments: [
        job.id,
        job.type,
        JSON.stringify(job.payload),
        String(job.runAt.getTime()),
        String(job.maxAttempts),
      ],
    });

    return Number(result) === 1;
  }

  async claim(limit: number, now: Date, leaseMs: number): Promise<ClaimedJob[]> {
    const result = await this.client().eval(CLAIM_SCRIPT, {
      keys: [PENDING_KEY, ACTIVE_KEY],
      arguments: [String(now.getTime()), String(limit), String(now.getTime() + leaseMs)],
    });

    if (!Array.isArray(result)) {
      return [];
    }

    const ids = result.map(String);
    const jobs = await Promise.all(ids.map((id) => this.get(id)));

    return jobs.filter((job): job is ClaimedJob => job !== null);
  }

  async get(id: string): Promise<ClaimedJob | null> {
    const fields = await this.client().hGetAll(jobKey(id));

    if (fields.id === undefined) {
      return null;
    }

    return {
      id: fields.id,
      type: fields.type ?? '',
      payload: parsePayload(fields.payload),
      runAt: new Date(Number(fields.runAt ?? '0')),
      maxAttempts: Number(fields.maxAttempts ?? '3'),
      attempts: Number(fields.attempts ?? '0'),
      leasedUntil: new Date(Number(fields.leasedUntil ?? '0')),
    };
  }

  async complete(id: string): Promise<void> {
    await this.client().eval(COMPLETE_SCRIPT, {
      keys: [ACTIVE_KEY],
      arguments: [id],
    });
  }

  async retry(id: string, runAt: Date, error: string): Promise<void> {
    await this.client().eval(RETRY_SCRIPT, {
      keys: [ACTIVE_KEY, DEAD_KEY, PENDING_KEY],
      arguments: [id, String(runAt.getTime()), error],
    });
  }

  async dead(id: string, error: string): Promise<void> {
    await this.client().eval(DEAD_SCRIPT, {
      keys: [ACTIVE_KEY, DEAD_KEY],
      arguments: [id, error],
    });
  }

  async recover(limit: number, now: Date): Promise<number> {
    const result = await this.client().eval(RECOVER_SCRIPT, {
      keys: [ACTIVE_KEY, PENDING_KEY],
      arguments: [String(now.getTime()), String(limit)],
    });

    return Number(result);
  }

  async markSlot(key: string, ttlMs: number, _now: Date): Promise<boolean> {
    const result = await this.client().set(`${PREFIX}slot:${key}`, '1', {
      NX: true,
      EX: Math.max(1, Math.ceil(ttlMs / 1000)),
    });

    return result === 'OK' || (result !== null && String(result).toUpperCase() === 'OK');
  }
}

function parsePayload(value: string | undefined): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
