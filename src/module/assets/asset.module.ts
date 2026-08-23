import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities (TypeORM)
import { AssetTypeOrmEntity } from './infrastructures/entities/asset.typeorm-entity';
import { AssetAllocationTypeOrmEntity } from './infrastructures/entities/asset-allocation.typeorm-entity';
import { LiquidationProofTypeOrmEntity } from './infrastructures/entities/liquidation-proof.typeorm-entity';

// Repositories & Services
import { AssetRepository } from './infrastructures/repositories/asset.repository';
import { ASSET_REPOSITORY_TOKEN } from './domains/repositories/asset.repository.interface';
import { EncryptionService } from './infrastructures/services/encryption.service';
import { ENCRYPTION_SERVICE_TOKEN } from './domains/services/encryption.service.interface';
import { MockForensicValidatorService } from './infrastructures/services/mock-forensic-validator.service';
import { FORENSIC_VALIDATOR_TOKEN } from './applications/services/forensic-validator.interface';

// Use Cases
import { CreateAssetUseCase } from './applications/use-cases/create-asset.use-case';
import { GetMyAssetsUseCase } from './applications/use-cases/get-my-assets.use-case';
import { UpdateAssetUseCase } from './applications/use-cases/update-asset.use-case';
import { DeleteAssetUseCase } from './applications/use-cases/delete-asset.use-case';
import { VerifyAssetUseCase } from './applications/use-cases/verify-asset.use-case';
import { AllocateAssetUseCase } from './applications/use-cases/allocate-asset.use-case';
import { UnlockAssetUseCase } from './applications/use-cases/unlock-asset.use-case';
import { UploadLiquidationProofUseCase } from './applications/use-cases/upload-liquidation-proof.use-case';
import { AcknowledgeDistributionUseCase } from './applications/use-cases/acknowledge-distribution.use-case';
import { CloseAssetUseCase } from './applications/use-cases/close-asset.use-case';

// Orchestrator
import { AssetOrchestrator } from './applications/orchestrator/asset.orchestrator';

// Interface
import { AssetController } from './interface/http/asset.controller';

// Listeners
import { InheritanceDisputedListener } from './infrastructures/listeners/inheritance-disputed.listener';
import { InheritanceApprovedListener } from './infrastructures/listeners/inheritance-approved.listener';

// Scheduler
import { AssetSchedulerService } from './applications/services/asset-scheduler.service';

const USE_CASES = [
  CreateAssetUseCase,
  GetMyAssetsUseCase,
  UpdateAssetUseCase,
  DeleteAssetUseCase,
  VerifyAssetUseCase,
  AllocateAssetUseCase,
  UnlockAssetUseCase,
  UploadLiquidationProofUseCase,
  AcknowledgeDistributionUseCase,
  CloseAssetUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetTypeOrmEntity,
      AssetAllocationTypeOrmEntity,
      LiquidationProofTypeOrmEntity,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AssetController],
  providers: [
    // ── Repositories (Dependency Inversion) ────────────────────────
    {
      provide: ASSET_REPOSITORY_TOKEN,
      useClass: AssetRepository,
    },
    {
      provide: ENCRYPTION_SERVICE_TOKEN,
      useClass: EncryptionService,
    },
    {
      provide: FORENSIC_VALIDATOR_TOKEN,
      useClass: MockForensicValidatorService,
    },

    // ── Application Layer ──────────────────────────────────────────
    ...USE_CASES,
    AssetOrchestrator,

    // ── Event Listeners ────────────────────────────────────────────
    InheritanceDisputedListener,
    InheritanceApprovedListener,

    // ── Scheduler ──────────────────────────────────────────────────
    AssetSchedulerService,
  ],
  exports: [ASSET_REPOSITORY_TOKEN],
})
export class AssetModule {}
