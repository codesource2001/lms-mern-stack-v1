export interface SeedDefinition {
  /** Stable, unique name used in logs and failure reports. */
  name: string;
  /** Must be idempotent: running it twice must not duplicate records. */
  run: () => Promise<void>;
}

export interface SeedResult {
  name: string;
  durationMs: number;
}

export class SeedExecutionError extends Error {
  readonly seedName: string;
  readonly applied: readonly SeedResult[];

  constructor(seedName: string, applied: readonly SeedResult[], cause: unknown) {
    super(`Seed "${seedName}" failed`, { cause });
    this.name = 'SeedExecutionError';
    this.seedName = seedName;
    this.applied = applied;
  }
}
