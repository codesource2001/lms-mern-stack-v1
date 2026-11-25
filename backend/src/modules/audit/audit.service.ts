import { logger } from '../../config/logger.js';
import { MongoAuditRepository, type AuditLogEntry } from './audit-log.model.js';

export interface AuditService {
  record(entry: AuditLogEntry): Promise<void>;
}

export class AuditLogService implements AuditService {
  constructor(private readonly repository: { create(entry: AuditLogEntry): Promise<void> }) {}

  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await this.repository.create(entry);
    } catch (error) {
      logger.error({ err: error, action: entry.action }, 'Audit log write failed');
    }
  }
}

/** Used by unit tests that construct services without infrastructure. */
export const noOpAudit: AuditService = {
  record: () => Promise.resolve(),
};

export const auditService = new AuditLogService(new MongoAuditRepository());
