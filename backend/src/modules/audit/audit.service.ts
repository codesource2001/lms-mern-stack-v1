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

export const auditService = new AuditLogService(new MongoAuditRepository());
