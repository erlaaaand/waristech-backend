import { Module } from '@nestjs/common';

// External Modules
import { UserModule } from '../identity/users/user.module';
import { AuthModule } from '../identity/auth/auth.module';
import { InheritanceModule } from '../inheritance/inheritance.module';

// Domain
import { ProofOfLifePolicyService } from './domains/services/proof-of-life-policy.service';

// Application
import { CheckInUseCase } from './applications/use-cases/check-in.use-case';
import { GetStatusUseCase } from './applications/use-cases/get-status.use-case';
import { ProofOfLifeSchedulerService } from './applications/services/proof-of-life-scheduler.service';

// Interface
import { ProofOfLifeController } from './interface/http/proof-of-life.controller';

@Module({
  imports: [UserModule, AuthModule, InheritanceModule],
  controllers: [ProofOfLifeController],
  providers: [
    ProofOfLifePolicyService,
    CheckInUseCase,
    GetStatusUseCase,
    ProofOfLifeSchedulerService,
  ],
})
export class ProofOfLifeModule {}
