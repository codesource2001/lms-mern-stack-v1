import { describe, expect, it, vi } from 'vitest';

import { MemoryJobStore } from '../src/infrastructure/jobs/memory-job.store.js';
import { JobWorker } from '../src/infrastructure/jobs/job-worker.js';
import type { JobHandler } from '../src/infrastructure/jobs/job.types.js';

const BASE = new Date('2026-11-25T12:00:00.000Z');

function makeWorker(
  handlers: ReadonlyMap<string, JobHandler>,
  repeatables: ConstructorParameters<typeof JobWorker>[2]['repeatables'] = [],
) {
  const store = new MemoryJobStore();
  const worker = new JobWorker(store, handlers, {
    pollIntervalMs: 1_000,
    leaseMs: 10_000,
    claimLimit: 20,
    repeatables,
  });

  return { store, worker };
}

describe('background job worker', () => {
  it('enqueues a deterministic job only once', async () => {
    const store = new MemoryJobStore();
    const job = {
      id: 'notification-email-1',
      type: 'notification_email',
      payload: {},
      runAt: BASE,
      maxAttempts: 3,
    };

    expect(await store.enqueue(job)).toBe(true);
    expect(await store.enqueue(job)).toBe(false);
    expect(store.getStatus(job.id)).toBe('pending');
  });

  it('retries a failing job with backoff and dead-letters it after the limit', async () => {
    const handler = vi.fn(() => Promise.reject(new Error('SMTP unavailable')));
    const { store, worker } = makeWorker(new Map([['test_job', handler]]));

    await store.enqueue({
      id: 'job-1',
      type: 'test_job',
      payload: {},
      runAt: BASE,
      maxAttempts: 2,
    });

    await worker.tick(BASE);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(store.getStatus('job-1')).toBe('pending');
    expect(store.getAttempts('job-1')).toBe(1);

    await worker.tick(new Date(BASE.getTime() + 2_000));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(store.getStatus('job-1')).toBe('dead');
  });

  it('recovers a job whose lease expired and completes it', async () => {
    const handler = vi.fn(async () => {});
    const { store, worker } = makeWorker(new Map([['test_job', handler]]));

    await store.enqueue({
      id: 'job-1',
      type: 'test_job',
      payload: {},
      runAt: BASE,
      maxAttempts: 3,
    });
    await store.claim(10, BASE, 100);

    expect(store.getStatus('job-1')).toBe('active');

    await worker.tick(new Date(BASE.getTime() + 200));

    expect(store.getStatus('job-1')).toBe('completed');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('enqueues a repeatable job once per interval slot', async () => {
    const { store, worker } = makeWorker(new Map([['assignment_reminders', async () => {}]]), [
      {
        name: 'assignment_reminders',
        intervalMs: 1_000,
        type: 'assignment_reminders',
        payload: {},
      },
    ]);

    await worker.tick(BASE);
    await worker.tick(new Date(BASE.getTime() + 100));
    const slot = Math.floor(BASE.getTime() / 1_000);
    expect(store.getStatus(`scheduler:assignment_reminders:${slot}`)).toBe('completed');

    await worker.tick(new Date(BASE.getTime() + 1_000));
    expect(store.getStatus(`scheduler:assignment_reminders:${slot + 1}`)).toBe('completed');
  });

  it('dead-letters a job without a registered handler', async () => {
    const { store, worker } = makeWorker(new Map());

    await store.enqueue({
      id: 'orphan',
      type: 'unknown_job',
      payload: {},
      runAt: BASE,
      maxAttempts: 3,
    });

    await worker.tick(BASE);
    expect(store.getStatus('orphan')).toBe('dead');
  });
});
