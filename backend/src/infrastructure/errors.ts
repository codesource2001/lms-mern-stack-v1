export type DependencyName = 'mongodb' | 'redis';

const DEPENDENCY_LABELS: Record<DependencyName, string> = {
  mongodb: 'MongoDB',
  redis: 'Redis',
};

const DEPENDENCY_HINTS: Record<DependencyName, string> = {
  mongodb: 'Verify MONGODB_URI and that MongoDB is running.',
  redis: 'Verify REDIS_URL and that Redis is running.',
};

/**
 * Wraps a startup connection failure with the dependency that failed, so the
 * final fatal log is actionable without reading a driver stack trace.
 */
export class DependencyConnectionError extends Error {
  readonly dependency: DependencyName;

  constructor(dependency: DependencyName, cause: unknown) {
    super(`${DEPENDENCY_LABELS[dependency]} connection failed. ${DEPENDENCY_HINTS[dependency]}`, {
      cause,
    });
    this.name = 'DependencyConnectionError';
    this.dependency = dependency;
  }
}
