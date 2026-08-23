import { Module } from '@nestjs/common';
import { AssetModule } from '../assets/asset.module';
import { InheritanceModule } from '../inheritance/inheritance.module';

// Strategies
import { FaraidhStrategy } from './domains/strategies/faraidh.strategy';
import { CivilStrategy } from './domains/strategies/civil.strategy';
import { CustomaryStrategy } from './domains/strategies/customary.strategy';

// Factory
import { CalculationStrategyFactory } from './applications/factories/calculation-strategy.factory';

// Use Cases
import { SimulateDistributionUseCase } from './applications/use-cases/simulate-distribution.use-case';
import { GetDashboardUseCase } from './applications/use-cases/get-dashboard.use-case';

// Orchestrator
import { CalculationOrchestrator } from './applications/orchestrator/calculation.orchestrator';

// Interface
import { CalculationController } from './interface/http/calculation.controller';

@Module({
  imports: [
    AssetModule, // Butuh ASSET_REPOSITORY_TOKEN
    InheritanceModule, // Butuh FAMILY_MEMBER_REPOSITORY_TOKEN
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

    // Orchestrator
    CalculationOrchestrator,
  ],
})
export class CalculationModule {}
