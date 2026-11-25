export interface JobDefinition {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  runAt: Date;
  maxAttempts: number;
}

export interface ClaimedJob extends JobDefinition {
  attempts: number;
  leasedUntil: Date;
}

export interface RepeatableJob {
  name: string;
  intervalMs: number;
  type: string;
  payload: Record<string, unknown>;
}

export type JobHandler = (payload: Record<string, unknown>, job: ClaimedJob) => Promise<void>;

export interface JobStore {
  enqueue(job: JobDefinition): Promise<boolean>;
  claim(limit: number, now: Date, leaseMs: number): Promise<ClaimedJob[]>;
  get(id: string): Promise<ClaimedJob | null>;
  complete(id: string): Promise<void>;
  retry(id: string, runAt: Date, error: string): Promise<void>;
  dead(id: string, error: string): Promise<void>;
  recover(limit: number, now: Date): Promise<number>;
  markSlot(key: string, ttlMs: number, now: Date): Promise<boolean>;
}
