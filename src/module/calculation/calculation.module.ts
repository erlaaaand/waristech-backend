import { Module } from '@nestjs/common';
import { AssetModule } from '../assets/asset.module';
import { InheritanceModule } from '../inheritance/inheritance.module';
import { UserModule } from '../identity/users/user.module';

// Strategies
import { FaraidhStrategy } from './domains/strategies/faraidh.strategy';
import { CivilStrategy } from './domains/strategies/civil.strategy';
import { CustomaryStrategy } from './domains/strategies/customary.strategy';

// Factory
import { CalculationStrategyFactory } from './applications/factories/calculation-strategy.factory';

// Use Cases
import { SimulateDistributionUseCase } from './applications/use-cases/simulate-distribution.use-case';
import { GetDashboardUseCase } from './applications/use-cases/get-dashboard.use-case';
import { SetCalculationPreferenceUseCase } from './applications/use-cases/set-calculation-preference.use-case';
import { GetCalculationPreferenceUseCase } from './applications/use-cases/get-calculation-preference.use-case';

// Orchestrator
import { CalculationOrchestrator } from './applications/orchestrator/calculation.orchestrator';

// Interface
import { CalculationController } from './interface/http/calculation.controller';

@Module({
  imports: [
    AssetModule, // Butuh ASSET_REPOSITORY_TOKEN
    InheritanceModule, // Butuh FAMILY_MEMBER_REPOSITORY_TOKEN
    UserModule, // Butuh USER_REPOSITORY_TOKEN (preferensi skema hukum waris)
  ],
  controllers: [CalculationController],
  providers: [
    // Strategies
    FaraidhStrategy,
    CivilStrategy,
    CustomaryStrategy,

    // Factory
    CalculationStrategyFactory,

    // Use Cases
    SimulateDistributionUseCase,
    GetDashboardUseCase,
    SetCalculationPreferenceUseCase,
    GetCalculationPreferenceUseCase,

    // Orchestrator
    CalculationOrchestrator,
  ],
})
export class CalculationModule {}
