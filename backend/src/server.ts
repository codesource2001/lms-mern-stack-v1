import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = createApp();
const server = createServer(app);

const SHUTDOWN_TIMEOUT_MS = 10_000;
let isShuttingDown = false;

function shutdown(reason: string, exitCode = 0): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ reason }, 'Shutdown initiated');

  const forceExitTimer = setTimeout(() => {
    logger.fatal({ reason }, 'Graceful shutdown timed out');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  forceExitTimer.unref();

  server.close((error) => {
    clearTimeout(forceExitTimer);

    if (error) {
      logger.error({ err: error }, 'Failed to close the HTTP server');
      process.exit(1);
    }

    logger.info({ reason }, 'Shutdown complete');
    process.exit(exitCode);
  });

  server.closeIdleConnections();
}

server.on('error', (error) => {
  logger.fatal({ err: error }, 'HTTP server error');
  process.exit(1);
});

server.listen(env.PORT, '0.0.0.0', () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
      apiPrefix: env.API_PREFIX,
    },
    'Atrium API listening',
  );
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});
