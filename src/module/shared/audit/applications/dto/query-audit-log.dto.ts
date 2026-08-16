import {
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../domains/enums/audit.enum';

export interface QueryAuditLogDto {
  page?: number;
  limit?: number;
  category?: AuditCategory;
  severity?: AuditSeverity;
  status?: AuditStatus;
  action?: string;
  userId?: string;
  resource?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginatedAuditResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
