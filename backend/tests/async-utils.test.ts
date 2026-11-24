import { describe, expect, it } from 'vitest';

import { retry } from '../src/shared/async/retry.js';
import { withTimeout } from '../src/shared/async/with-timeout.js';

describe('async utilities', () => {
  it('retries until the operation succeeds', async () => {
    let attempts = 0;

    const result = await retry(
      () => {
        attempts += 1;
        if (attempts < 3) {
          return Promise.reject(new Error('transient'));
        }

        return Promise.resolve('ok');
      },
      { attempts: 3, delayMs: 1 },
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('rethrows the final error after exhausting attempts', async () => {
    let attempts = 0;

    await expect(
      retry(
        () => {
          attempts += 1;
          return Promise.reject(new Error(`failure ${attempts}`));
        },
        { attempts: 2, delayMs: 1 },
      ),
    ).rejects.toThrow('failure 2');

    expect(attempts).toBe(2);
  });

  it('bounds an operation that never settles', async () => {
    await expect(withTimeout(new Promise(() => undefined), 5, 'readiness check')).rejects.toThrow(
      'readiness check timed out after 5ms',
    );
  });

  it('returns the value of a timely operation', async () => {
    await expect(withTimeout(Promise.resolve('ready'), 50, 'readiness check')).resolves.toBe(
      'ready',
    );
  });
});
