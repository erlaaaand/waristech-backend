import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './domains/entities/audit-log.schema';
import { AuditLogRepository } from './infrastructures/repositories/audit-log.repository';
import { AUDIT_LOG_REPOSITORY_TOKEN } from './infrastructures/repositories/audit-log.repository.interface';
import { AuditLogService } from './applications/services/audit-log.service';
import { AuditLogListener } from './infrastructures/listeners/audit-log.listener';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditLogController } from './interface/http/audit-log.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditLogController],
  providers: [
    {
      provide: AUDIT_LOG_REPOSITORY_TOKEN,
      useClass: AuditLogRepository,
    },
    AuditLogService,
    AuditLogListener,
    AuditInterceptor,
  ],
  exports: [AUDIT_LOG_REPOSITORY_TOKEN, AuditLogService, AuditInterceptor],
})
export class AuditModule {}
