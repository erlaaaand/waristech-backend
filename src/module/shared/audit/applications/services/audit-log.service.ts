import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AUDIT_LOG_REPOSITORY_TOKEN,
  type IAuditLogRepository,
} from '../../infrastructures/repositories/audit-log.repository.interface';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';
import {
  PaginatedAuditResult,
  QueryAuditLogDto,
} from '../dto/query-audit-log.dto';
import { AuditLogDocument } from '../../domains/entities/audit-log.schema';
import { AuditLogEvent } from '../events/audit-log.event';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly isEnabled: boolean;

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN)
    private readonly auditRepo: IAuditLogRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.isEnabled =
      this.configService.get<boolean>('AUDIT_LOG_ENABLED') ?? true;
  }

  /**
   * Log critical activity asynchronously via event emitter
   * (Zero blocking overhead on primary API response)
   */
  logAsync(dto: CreateAuditLogDto): void {
    if (!this.isEnabled) return;
    this.eventEmitter.emit(AuditLogEvent.EVENT_NAME, new AuditLogEvent(dto));
  }

  /**
   * Direct logging to MongoDB with non-blocking error handling
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.auditRepo.create(dto);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to record audit log: ${dto.action} on ${dto.resource}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findAll(
    query: QueryAuditLogDto,
  ): Promise<PaginatedAuditResult<AuditLogDocument>> {
    return this.auditRepo.findAllPaginated(query);
  }

  async findById(id: string): Promise<AuditLogDocument | null> {
    return this.auditRepo.findById(id);
  }
}
