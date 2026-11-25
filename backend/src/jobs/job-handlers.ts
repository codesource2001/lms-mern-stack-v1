import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { getJobStore } from '../infrastructure/jobs/job-queue.js';
import { JobWorker } from '../infrastructure/jobs/job-worker.js';
import type { JobHandler } from '../infrastructure/jobs/job.types.js';
import { announcementService } from '../modules/announcements/announcement.service.js';
import { notificationService } from '../modules/notifications/notification.service.js';

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export const jobHandlers = new Map<string, JobHandler>([
  [
    'notification_email',
    async (payload) => {
      await notificationService.deliverEmail(stringValue(payload.notificationId));
    },
  ],
  [
    'announcement_fanout',
    async (payload) => {
      await announcementService.fanout(stringValue(payload.announcementId));
    },
  ],
  [
    'assignment_reminders',
    async () => {
      await notificationService.createDeadlineReminders(new Date(), env.JOBS_REMINDER_WINDOW_MS);
    },
  ],
]);

export function startBackgroundJobs(): JobWorker | null {
  if (!env.JOBS_WORKER_ENABLED) {
    logger.info('Background job worker disabled');
    return null;
  }

  const worker = new JobWorker(getJobStore(), jobHandlers, {
    pollIntervalMs: env.JOBS_POLL_INTERVAL_MS,
    leaseMs: env.JOBS_JOB_LEASE_MS,
    claimLimit: env.JOBS_CLAIM_LIMIT,
    repeatables: [
      {
        name: 'assignment_reminders',
        intervalMs: env.JOBS_REMINDER_INTERVAL_MS,
        type: 'assignment_reminders',
        payload: {},
      },
    ],
  });

  worker.start();
  logger.info(
    {
      pollIntervalMs: env.JOBS_POLL_INTERVAL_MS,
      reminderIntervalMs: env.JOBS_REMINDER_INTERVAL_MS,
    },
    'Background job worker started',
  );

  return worker;
}
