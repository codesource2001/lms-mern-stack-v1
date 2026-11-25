import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectInfrastructure, disconnectInfrastructure } from './infrastructure/index.js';
import { startBackgroundJobs } from './jobs/job-handlers.js';
import { createGracefulShutdown } from './shared/process/graceful-shutdown.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start(): Promise<void> {
  await connectInfrastructure();

  const app = createApp();
  const server = createServer(app);
  const worker = startBackgroundJobs();

  const shutdown = createGracefulShutdown({
    server,
    closeResources: async () => {
      await worker?.stop();
      await disconnectInfrastructure();
    },
    timeoutMs: SHUTDOWN_TIMEOUT_MS,
    logger,
    exit: (exitCode) => {
      process.exit(exitCode);
    },
  });

  server.on('error', (error) => {
    logger.fatal({ err: error }, 'HTTP server error');
    void shutdown('httpServerError', 1);
  });

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      {
        port: env.PORT,
        environment: env.NODE_ENV,
        apiPrefix: env.API_PREFIX,
        apiDocsEnabled: env.ENABLE_API_DOCS,
      },
      'Atrium API listening',
    );
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    void shutdown('unhandledRejection', 1);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException', 1);
  });
}

start().catch(async (error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start Atrium API');
  await disconnectInfrastructure();
  process.exit(1);
});
