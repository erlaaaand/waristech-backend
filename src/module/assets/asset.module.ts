import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// External Modules
import { UserModule } from '../identity/users/user.module';
import { InheritanceModule } from '../inheritance/inheritance.module';

// Reuse (bukan modul CalculationModule — CalculationModule sendiri meng-import
// AssetModule, jadi mengimpornya di sini akan membuat circular dependency.
// Strategy classes ini pure/stateless, aman disediakan ulang sebagai provider lokal).
import { FaraidhStrategy } from '../calculation/domains/strategies/faraidh.strategy';
import { CivilStrategy } from '../calculation/domains/strategies/civil.strategy';
import { CustomaryStrategy } from '../calculation/domains/strategies/customary.strategy';
import { CalculationStrategyFactory } from '../calculation/applications/factories/calculation-strategy.factory';

// Entities (TypeORM)
import { AssetTypeOrmEntity } from './infrastructures/entities/asset.typeorm-entity';
import { AssetAllocationTypeOrmEntity } from './infrastructures/entities/asset-allocation.typeorm-entity';
import { LiquidationProofTypeOrmEntity } from './infrastructures/entities/liquidation-proof.typeorm-entity';
import { KeyShareTypeOrmEntity } from './infrastructures/entities/key-share.typeorm-entity';

// Repositories & Services
import { AssetRepository } from './infrastructures/repositories/asset.repository';
import { ASSET_REPOSITORY_TOKEN } from './domains/repositories/asset.repository.interface';
import { EncryptionService } from './infrastructures/services/encryption.service';
import { ENCRYPTION_SERVICE_TOKEN } from './domains/services/encryption.service.interface';
import { SecretSharingService } from './infrastructures/services/secret-sharing.service';
import { SECRET_SHARING_SERVICE_TOKEN } from './domains/services/secret-sharing.service.interface';
import { KeyShareRepository } from './infrastructures/repositories/key-share.repository';
import { KEY_SHARE_REPOSITORY_TOKEN } from './domains/repositories/key-share.repository.interface';

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
import { GetPendingAssetsNotarisUseCase } from './applications/use-cases/get-pending-assets-notaris.use-case';
import { GetAllocatedAssetsAhliWarisUseCase } from './applications/use-cases/get-allocated-assets-ahli-waris.use-case';
import { GetHistoryAssetsNotarisUseCase } from './applications/use-cases/get-history-assets-notaris.use-case';
import { EscrowNotarisShareUseCase } from './applications/use-cases/escrow-notaris-share.use-case';
import { GetAssetGuidanceUseCase } from './applications/use-cases/get-asset-guidance.use-case';
import { RotateKeySharesUseCase } from './applications/use-cases/rotate-key-shares.use-case';
import { RequestLegalFallbackUseCase } from './applications/use-cases/request-legal-fallback.use-case';
import { ReviewLiquidationProofUseCase } from './applications/use-cases/review-liquidation-proof.use-case';
import { GetPendingLiquidationReviewsUseCase } from './applications/use-cases/get-pending-liquidation-reviews.use-case';
import { InheritanceGuidanceService } from './domains/services/inheritance-guidance.service';

// Orchestrator
import { AssetOrchestrator } from './applications/orchestrator/asset.orchestrator';

// Interface
import { AssetController } from './interface/http/asset.controller';

// Listeners
import { InheritanceDisputedListener } from './infrastructures/listeners/inheritance-disputed.listener';
import { InheritanceApprovedListener } from './infrastructures/listeners/inheritance-approved.listener';

// Scheduler
import { AssetSchedulerService } from './applications/services/asset-scheduler.service';
import { AssetNotifierService } from './applications/services/asset-notifier.service';

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
  GetPendingAssetsNotarisUseCase,
  GetAllocatedAssetsAhliWarisUseCase,
  GetHistoryAssetsNotarisUseCase,
  EscrowNotarisShareUseCase,
  GetAssetGuidanceUseCase,
  RotateKeySharesUseCase,
  RequestLegalFallbackUseCase,
  ReviewLiquidationProofUseCase,
  GetPendingLiquidationReviewsUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetTypeOrmEntity,
      AssetAllocationTypeOrmEntity,
      LiquidationProofTypeOrmEntity,
      KeyShareTypeOrmEntity,
    ]),
    ScheduleModule.forRoot(),
    UserModule,
    InheritanceModule,
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
      provide: SECRET_SHARING_SERVICE_TOKEN,
      useClass: SecretSharingService,
    },
    {
      provide: KEY_SHARE_REPOSITORY_TOKEN,
      useClass: KeyShareRepository,
    },

    // ── Domain Services ────────────────────────────────────────────
    InheritanceGuidanceService,

    // ── Notifikasi Alur Aset ───────────────────────────────────────
    AssetNotifierService,

    // ── Kalkulator Skema Hukum Waris (reuse, lihat catatan impor di atas) ──
    FaraidhStrategy,
    CivilStrategy,
    CustomaryStrategy,
    CalculationStrategyFactory,

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
