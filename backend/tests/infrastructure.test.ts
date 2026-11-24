import { describe, expect, it } from 'vitest';

import { checkMongo } from '../src/infrastructure/mongo/connection.js';
import { checkReadiness } from '../src/infrastructure/readiness.js';
import { checkRedis } from '../src/infrastructure/redis/connection.js';

describe('dependency checks without a connection', () => {
  it('reports MongoDB as down instead of attempting a query', async () => {
    const result = await checkMongo(100);

    expect(result).toEqual({ status: 'down', latencyMs: 0 });
  });

  it('reports Redis as down instead of attempting a query', async () => {
    const result = await checkRedis(100);

    expect(result).toEqual({ status: 'down', latencyMs: 0 });
  });

  it('aggregates dependency state into a not-ready report', async () => {
    const report = await checkReadiness();

    expect(report).toMatchObject({
      status: 'not_ready',
      checks: {
        mongodb: { status: 'down' },
        redis: { status: 'down' },
      },
    });
    expect(report.checkedAt).toEqual(expect.any(String));
  });
});
