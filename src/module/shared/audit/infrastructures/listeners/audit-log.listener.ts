import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogEvent } from '../../applications/events/audit-log.event';
import {
  AUDIT_LOG_REPOSITORY_TOKEN,
  type IAuditLogRepository,
} from '../repositories/audit-log.repository.interface';

@Injectable()
export class AuditLogListener {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  @OnEvent(AuditLogEvent.EVENT_NAME, { async: true })
  async handleAuditLogEvent(event: AuditLogEvent): Promise<void> {
    try {
      await this.auditRepo.create(event.payload);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to persist audit log asynchronously: ${event.payload.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
