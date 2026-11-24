export interface ClosableServer {
  close(callback: (error?: Error) => void): void;
  closeIdleConnections?: () => void;
}

export interface ShutdownLogger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
  fatal(context: Record<string, unknown>, message: string): void;
}

export interface GracefulShutdownOptions {
  server: ClosableServer;
  closeResources: () => Promise<void>;
  timeoutMs: number;
  logger: ShutdownLogger;
  exit: (exitCode: number) => void;
}

export type Shutdown = (reason: string, exitCode?: number) => Promise<void>;

/**
 * Creates a single-use shutdown routine: stop accepting HTTP connections,
 * close dependency clients, then exit. A force-exit timer guarantees the
 * process cannot hang indefinitely.
 */
export function createGracefulShutdown(options: GracefulShutdownOptions): Shutdown {
  let shuttingDown = false;

  return async (reason, exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    options.logger.info({ reason }, 'Shutdown initiated');

    const forceExitTimer = setTimeout(() => {
      options.logger.fatal({ reason }, 'Graceful shutdown timed out');
      options.exit(1);
    }, options.timeoutMs);

    forceExitTimer.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        options.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });

        options.server.closeIdleConnections?.();
      });

      await options.closeResources();
      clearTimeout(forceExitTimer);

      options.logger.info({ reason }, 'Shutdown complete');
      options.exit(exitCode);
    } catch (error) {
      clearTimeout(forceExitTimer);
      options.logger.error({ reason, err: error }, 'Shutdown failed');
      options.exit(1);
    }
  };
}
