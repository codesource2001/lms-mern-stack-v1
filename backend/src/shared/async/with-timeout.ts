export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Bounds how long a caller waits for an operation. The underlying operation is
 * not cancelled; use only for checks where abandoning the result is safe.
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationLabel: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new TimeoutError(operationLabel, timeoutMs));
        }, timeoutMs);

        timer.unref();
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
