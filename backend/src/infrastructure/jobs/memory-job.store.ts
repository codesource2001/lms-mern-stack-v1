import type { ClaimedJob, JobDefinition, JobStore } from './job.types.js';

interface StoredJob {
  definition: JobDefinition;
  attempts: number;
  status: 'pending' | 'active' | 'completed' | 'dead';
  leasedUntil: Date | null;
  lastError: string | null;
}

/** In-memory store used by unit tests. The production store is Redis-backed. */
export class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, StoredJob>();
  private readonly slots = new Map<string, number>();

  enqueue(job: JobDefinition): Promise<boolean> {
    if (this.jobs.has(job.id)) {
      return Promise.resolve(false);
    }

    this.jobs.set(job.id, {
      definition: job,
      attempts: 0,
      status: 'pending',
      leasedUntil: null,
      lastError: null,
    });

    return Promise.resolve(true);
  }

  claim(limit: number, now: Date, leaseMs: number): Promise<ClaimedJob[]> {
    const due = [...this.jobs.values()]
      .filter((entry) => entry.status === 'pending' && entry.definition.runAt <= now)
      .sort((left, right) => left.definition.runAt.getTime() - right.definition.runAt.getTime())
      .slice(0, limit);

    const claimed = due.map((entry) => {
      entry.attempts += 1;
      entry.status = 'active';
      entry.leasedUntil = new Date(now.getTime() + leaseMs);
      return this.toClaimedJob(entry);
    });

    return Promise.resolve(claimed);
  }

  get(id: string): Promise<ClaimedJob | null> {
    const entry = this.jobs.get(id);
    return Promise.resolve(entry === undefined ? null : this.toClaimedJob(entry));
  }

  complete(id: string): Promise<void> {
    const entry = this.jobs.get(id);

    if (entry !== undefined) {
      entry.status = 'completed';
      entry.leasedUntil = null;
      entry.lastError = null;
    }

    return Promise.resolve();
  }

  retry(id: string, runAt: Date, error: string): Promise<void> {
    const entry = this.jobs.get(id);

    if (entry !== undefined) {
      entry.lastError = error;
      entry.leasedUntil = null;

      if (entry.attempts >= entry.definition.maxAttempts) {
        entry.status = 'dead';
      } else {
        entry.status = 'pending';
        entry.definition.runAt = runAt;
      }
    }

    return Promise.resolve();
  }

  dead(id: string, error: string): Promise<void> {
    const entry = this.jobs.get(id);

    if (entry !== undefined) {
      entry.status = 'dead';
      entry.lastError = error;
      entry.leasedUntil = null;
    }

    return Promise.resolve();
  }

  recover(limit: number, now: Date): Promise<number> {
    const stale = [...this.jobs.values()]
      .filter(
        (entry) =>
          entry.status === 'active' && entry.leasedUntil !== null && entry.leasedUntil <= now,
      )
      .slice(0, limit);

    for (const entry of stale) {
      entry.status = 'pending';
      entry.leasedUntil = null;
    }

    return Promise.resolve(stale.length);
  }

  markSlot(key: string, ttlMs: number, now: Date): Promise<boolean> {
    const expiresAt = this.slots.get(key);

    if (expiresAt !== undefined && expiresAt > now.getTime()) {
      return Promise.resolve(false);
    }

    this.slots.set(key, now.getTime() + ttlMs);
    return Promise.resolve(true);
  }

  getStatus(id: string): StoredJob['status'] | undefined {
    return this.jobs.get(id)?.status;
  }

  getAttempts(id: string): number | undefined {
    return this.jobs.get(id)?.attempts;
  }

  private toClaimedJob(entry: StoredJob): ClaimedJob {
    return {
      ...entry.definition,
      attempts: entry.attempts,
      leasedUntil: entry.leasedUntil ?? new Date(0),
    };
  }
}
