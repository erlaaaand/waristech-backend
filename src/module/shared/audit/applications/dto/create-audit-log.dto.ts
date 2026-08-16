import {
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../domains/enums/audit.enum';

export interface AuditActorDto {
  userId?: string | null;
  email?: string | null;
  fullName?: string | null;
  role?: string;
}

export interface CreateAuditLogDto {
  action: string;
  category: AuditCategory;
  severity?: AuditSeverity;
  status?: AuditStatus;
  actor: AuditActorDto;
  resource: string;
  resourceId?: string | null;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
}
