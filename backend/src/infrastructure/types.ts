export type DependencyState = 'up' | 'down';

export interface DependencyCheck {
  status: DependencyState;
  latencyMs: number;
}

export interface ReadinessChecks {
  mongodb: DependencyCheck;
  redis: DependencyCheck;
}

export interface ReadinessReport {
  status: 'ready' | 'not_ready';
  checkedAt: string;
  checks: ReadinessChecks;
}
