import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { AuditCategory, AuditSeverity } from '../domains/enums/audit.enum';

export const AUDIT_METADATA_KEY = 'AUDIT_METADATA_KEY';

export interface AuditOptions {
  action: string;
  category: AuditCategory;
  resource: string;
  severity?: AuditSeverity;
  description?: string;
}

export const Audit = (options: AuditOptions): CustomDecorator<string> =>
  SetMetadata(AUDIT_METADATA_KEY, options);
