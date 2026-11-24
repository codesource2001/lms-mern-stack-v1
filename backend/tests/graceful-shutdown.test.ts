import { describe, expect, it, vi } from 'vitest';

import {
  createGracefulShutdown,
  type ShutdownLogger,
} from '../src/shared/process/graceful-shutdown.js';

describe('graceful shutdown', () => {
  it('closes HTTP, releases resources, and exits once', async () => {
    const events: string[] = [];
    const info = vi.fn();
    const logger: ShutdownLogger = {
      info,
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };
    const exit = vi.fn<(code: number) => void>();

    const shutdown = createGracefulShutdown({
      server: {
        close: (callback) => {
          events.push('server.close');
          callback();
        },
        closeIdleConnections: () => {
          events.push('server.closeIdleConnections');
        },
      },
      closeResources: () => {
        events.push('closeResources');
        return Promise.resolve();
      },
      timeoutMs: 1_000,
      logger,
      exit,
    });

    await shutdown('SIGTERM');
    await shutdown('SIGTERM');

    expect(events).toEqual(['server.close', 'server.closeIdleConnections', 'closeResources']);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
    expect(info).toHaveBeenCalledWith({ reason: 'SIGTERM' }, 'Shutdown complete');
  });

  it('exits with failure when HTTP cannot close', async () => {
    const error = vi.fn();
    const logger: ShutdownLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error,
      fatal: vi.fn(),
    };
    const exit = vi.fn<(code: number) => void>();
    const closeResources = vi.fn(() => Promise.resolve());

    const shutdown = createGracefulShutdown({
      server: {
        close: (callback) => {
          callback(new Error('close failed'));
        },
      },
      closeResources,
      timeoutMs: 1_000,
      logger,
      exit,
    });

    await shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledWith(1);
    expect(closeResources).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
