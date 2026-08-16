import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import {
  AUDIT_METADATA_KEY,
  AuditOptions,
} from '../decorators/audit.decorator';
import { AuditLogService } from '../applications/services/audit-log.service';
import { AuditSeverity, AuditStatus } from '../domains/enums/audit.enum';

interface RequestWithUser extends Request {
  user?: {
    sub?: string;
    id?: string;
    email?: string;
    role?: string;
    fullName?: string;
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditOptions = this.reflector.getAllAndOverride<
      AuditOptions | undefined
    >(AUDIT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!auditOptions) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('user-agent') || '';
    const resourceId =
      (req.params?.id as string) || (req.params?.userId as string) || null;

    const beforeState =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : null;

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          this.auditService.logAsync({
            action: auditOptions.action,
            category: auditOptions.category,
            severity: auditOptions.severity ?? AuditSeverity.INFO,
            status: AuditStatus.SUCCESS,
            actor: {
              userId: user?.sub || user?.id || null,
              email: user?.email || null,
              role: user?.role || 'ANONYMOUS',
              fullName: user?.fullName || null,
            },
            resource: auditOptions.resource,
            resourceId,
            description:
              auditOptions.description ||
              `${auditOptions.action} executed successfully`,
            ipAddress: ip,
            userAgent,
            beforeState,
            afterState:
              data && typeof data === 'object'
                ? (data as Record<string, unknown>)
                : null,
          });
        },
        error: (err: unknown) => {
          this.auditService.logAsync({
            action: auditOptions.action,
            category: auditOptions.category,
            severity: AuditSeverity.WARNING,
            status: AuditStatus.FAILURE,
            actor: {
              userId: user?.sub || user?.id || null,
              email: user?.email || null,
              role: user?.role || 'ANONYMOUS',
              fullName: user?.fullName || null,
            },
            resource: auditOptions.resource,
            resourceId,
            description: `Failed execution: ${auditOptions.action}`,
            ipAddress: ip,
            userAgent,
            beforeState,
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        },
      }),
    );
  }
}
