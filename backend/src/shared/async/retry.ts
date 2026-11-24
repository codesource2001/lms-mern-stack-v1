export interface RetryOptions {
  attempts: number;
  delayMs: number;
  onRetry?: (error: unknown, failedAttempt: number) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retries an async operation a bounded number of times. The final error is
 * rethrown as-is so callers can preserve operational context.
 */
export async function retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === options.attempts) {
        break;
      }

      options.onRetry?.(error, attempt);
      await delay(options.delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Operation failed after retries', { cause: lastError });
}
