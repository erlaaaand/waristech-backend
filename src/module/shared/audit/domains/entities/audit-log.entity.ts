import { AuditCategory, AuditSeverity, AuditStatus } from '../enums/audit.enum';

export class AuditActorDomain {
  constructor(
    public readonly userId: string | null,
    public readonly email: string | null,
    public readonly fullName: string | null,
    public readonly role: string,
  ) {}
}

export class AuditLogDomain {
  constructor(
    // Mongo ObjectId (bukan `id`) — dipertahankan agar kontrak HTTP tidak berubah.
    public readonly _id: string,
    public readonly action: string,
    public readonly category: AuditCategory,
    public readonly severity: AuditSeverity,
    public readonly status: AuditStatus,
    public readonly actor: AuditActorDomain,
    public readonly resource: string,
    public readonly resourceId: string | null,
    public readonly description: string,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly beforeState: Record<string, unknown> | null,
    public readonly afterState: Record<string, unknown> | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly errorMessage: string | null,
    public readonly timestamp: Date,
  ) {}

  isCritical(): boolean {
    return this.severity === AuditSeverity.CRITICAL;
  }
}
