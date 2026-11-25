import { logger } from '../../config/logger.js';
import type { ClaimedJob, JobHandler, JobStore, RepeatableJob } from './job.types.js';

export interface JobWorkerOptions {
  pollIntervalMs: number;
  leaseMs: number;
  claimLimit: number;
  repeatables: readonly RepeatableJob[];
}

function backoffMs(attempts: number): number {
  return Math.min(1_000 * 2 ** Math.max(0, attempts - 1), 60_000);
}

/** Polls the store, leases due jobs, and dispatches them to registered handlers. */
export class JobWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;

  constructor(
    private readonly store: JobStore,
    private readonly handlers: ReadonlyMap<string, JobHandler>,
    private readonly options: JobWorkerOptions,
  ) {}

  start(): void {
    if (this.timer !== null) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.pollIntervalMs);

    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }

    while (this.ticking) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  async tick(now: Date = new Date()): Promise<void> {
    if (this.ticking) {
      return;
    }

    this.ticking = true;

    try {
      await this.scheduleRepeatables(now);
      await this.store.recover(this.options.claimLimit, now);
      const jobs = await this.store.claim(this.options.claimLimit, now, this.options.leaseMs);

      await Promise.all(jobs.map((job) => this.execute(job, now)));
    } finally {
      this.ticking = false;
    }
  }

  private async scheduleRepeatables(now: Date): Promise<void> {
    for (const repeatable of this.options.repeatables) {
      const slot = Math.floor(now.getTime() / repeatable.intervalMs);
      const slotKey = `${repeatable.name}:${slot}`;
      const claimed = await this.store.markSlot(slotKey, repeatable.intervalMs * 2, now);

      if (!claimed) {
        continue;
      }

      await this.store.enqueue({
        id: `scheduler:${slotKey}`,
        type: repeatable.type,
        payload: repeatable.payload,
        runAt: new Date(slot * repeatable.intervalMs),
        maxAttempts: 3,
      });
    }
  }

  private async execute(job: ClaimedJob, now: Date): Promise<void> {
    const handler = this.handlers.get(job.type);

    if (handler === undefined) {
      await this.store.dead(job.id, `No handler for job type ${job.type}`);
      return;
    }

    try {
      await handler(job.payload, job);
      await this.store.complete(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown job error';
      logger.error(
        { jobId: job.id, jobType: job.type, attempts: job.attempts, err: error },
        'Background job failed; scheduling retry',
      );
      await this.store.retry(job.id, new Date(now.getTime() + backoffMs(job.attempts)), message);
    }
  }
}
