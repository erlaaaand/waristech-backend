import { CreateAuditLogDto } from '../dto/create-audit-log.dto';

export class AuditLogEvent {
  static readonly EVENT_NAME = 'audit.log';

  constructor(public readonly payload: CreateAuditLogDto) {}
}
