import { AuditLogDomain } from '../entities/audit-log.entity';
import { CreateAuditLogDto } from '../../applications/dto/create-audit-log.dto';
import {
  PaginatedAuditResult,
  QueryAuditLogDto,
} from '../../applications/dto/query-audit-log.dto';

export interface IAuditLogRepository {
  create(dto: CreateAuditLogDto): Promise<AuditLogDomain>;
  findAllPaginated(
    query: QueryAuditLogDto,
  ): Promise<PaginatedAuditResult<AuditLogDomain>>;
  findById(id: string): Promise<AuditLogDomain | null>;
}

export const AUDIT_LOG_REPOSITORY_TOKEN = Symbol('IAuditLogRepository');
