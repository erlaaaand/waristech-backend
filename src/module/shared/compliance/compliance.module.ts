import { Module } from '@nestjs/common';

// External Modules
import { UserModule } from '../../identity/users/user.module';
import { AuthModule } from '../../identity/auth/auth.module';

// Use Cases
import { ReportDataBreachUseCase } from './applications/use-cases/report-data-breach.use-case';
import { GetMyConsentUseCase } from './applications/use-cases/get-my-consent.use-case';
import { GrantConsentUseCase } from './applications/use-cases/grant-consent.use-case';

// Interface
import { ComplianceController } from './interface/http/compliance.controller';

@Module({
  // AuditModule & NotificationsModule bersifat @Global() — tidak perlu di-import.
  imports: [UserModule, AuthModule],
  controllers: [ComplianceController],
  providers: [
    ReportDataBreachUseCase,
    GetMyConsentUseCase,
    GrantConsentUseCase,
  ],
})
export class ComplianceModule {}
