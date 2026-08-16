import { AuditLogDocument } from '../../domains/entities/audit-log.schema';
import { CreateAuditLogDto } from '../../applications/dto/create-audit-log.dto';
import {
  PaginatedAuditResult,
  QueryAuditLogDto,
} from '../../applications/dto/query-audit-log.dto';

export interface IAuditLogRepository {
  create(dto: CreateAuditLogDto): Promise<AuditLogDocument>;
  findAllPaginated(
    query: QueryAuditLogDto,
  ): Promise<PaginatedAuditResult<AuditLogDocument>>;
  findById(id: string): Promise<AuditLogDocument | null>;
}

export const AUDIT_LOG_REPOSITORY_TOKEN = Symbol('IAuditLogRepository');
