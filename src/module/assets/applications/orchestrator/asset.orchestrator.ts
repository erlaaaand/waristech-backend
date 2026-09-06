import { Injectable } from '@nestjs/common';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { UpdateAssetDto } from '../dto/update-asset.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import { CreateAssetUseCase } from '../use-cases/create-asset.use-case';
import { GetMyAssetsUseCase } from '../use-cases/get-my-assets.use-case';
import { UpdateAssetUseCase } from '../use-cases/update-asset.use-case';
import { DeleteAssetUseCase } from '../use-cases/delete-asset.use-case';
import { VerifyAssetUseCase } from '../use-cases/verify-asset.use-case';
import { AllocateAssetUseCase } from '../use-cases/allocate-asset.use-case';
import { UnlockAssetUseCase } from '../use-cases/unlock-asset.use-case';
import type { UnlockAssetResponse } from '../use-cases/unlock-asset.use-case';
import { UploadLiquidationProofUseCase } from '../use-cases/upload-liquidation-proof.use-case';
import { AcknowledgeDistributionUseCase } from '../use-cases/acknowledge-distribution.use-case';
import { CloseAssetUseCase } from '../use-cases/close-asset.use-case';
import { AllocateAssetDto } from '../dto/allocate-asset.dto';
import { CreateAssetResponseDto } from '../dto/create-asset-response.dto';
import { EscrowNotarisShareDto } from '../dto/escrow-notaris-share.dto';
import { EscrowNotarisShareUseCase } from '../use-cases/escrow-notaris-share.use-case';
import { GetAssetGuidanceUseCase } from '../use-cases/get-asset-guidance.use-case';
import type { AssetGuidanceResponse } from '../use-cases/get-asset-guidance.use-case';
import { RotateKeySharesUseCase } from '../use-cases/rotate-key-shares.use-case';
import { RotateKeySharesDto } from '../dto/rotate-key-shares.dto';
import { RequestLegalFallbackUseCase } from '../use-cases/request-legal-fallback.use-case';
import type { LegalFallbackResponse } from '../use-cases/request-legal-fallback.use-case';
import { RequestLegalFallbackDto } from '../dto/request-legal-fallback.dto';
import { UploadLiquidationProofDto } from '../dto/upload-liquidation-proof.dto';
import { AssetAllocationResponseDto } from '../dto/asset-response.dto';
import { GetPendingAssetsNotarisUseCase } from '../use-cases/get-pending-assets-notaris.use-case';
import { GetAllocatedAssetsAhliWarisUseCase } from '../use-cases/get-allocated-assets-ahli-waris.use-case';
import { GetHistoryAssetsNotarisUseCase } from '../use-cases/get-history-assets-notaris.use-case';
import { ReviewLiquidationProofUseCase } from '../use-cases/review-liquidation-proof.use-case';
import { ReviewLiquidationProofDto } from '../dto/review-liquidation-proof.dto';
import { GetPendingLiquidationReviewsUseCase } from '../use-cases/get-pending-liquidation-reviews.use-case';
import { LiquidationProofResponseDto } from '../dto/liquidation-proof-response.dto';

@Injectable()
export class AssetOrchestrator {
  constructor(
    private readonly createAssetUc: CreateAssetUseCase,
    private readonly getMyAssetsUc: GetMyAssetsUseCase,
    private readonly updateAssetUc: UpdateAssetUseCase,
    private readonly deleteAssetUc: DeleteAssetUseCase,
    private readonly verifyAssetUc: VerifyAssetUseCase,
    private readonly allocateAssetUc: AllocateAssetUseCase,
    private readonly unlockAssetUc: UnlockAssetUseCase,
    private readonly uploadLiquidationProofUc: UploadLiquidationProofUseCase,
    private readonly acknowledgeDistributionUc: AcknowledgeDistributionUseCase,
    private readonly closeAssetUc: CloseAssetUseCase,
    private readonly getPendingAssetsNotarisUc: GetPendingAssetsNotarisUseCase,
    private readonly getAllocatedAssetsAhliWarisUc: GetAllocatedAssetsAhliWarisUseCase,
    private readonly getHistoryAssetsNotarisUc: GetHistoryAssetsNotarisUseCase,
    private readonly escrowNotarisShareUc: EscrowNotarisShareUseCase,
    private readonly getAssetGuidanceUc: GetAssetGuidanceUseCase,
    private readonly rotateKeySharesUc: RotateKeySharesUseCase,
    private readonly requestLegalFallbackUc: RequestLegalFallbackUseCase,
    private readonly reviewLiquidationProofUc: ReviewLiquidationProofUseCase,
    private readonly getPendingLiquidationReviewsUc: GetPendingLiquidationReviewsUseCase,
  ) {}

  reviewLiquidationProof(
    proofId: string,
    notarisId: string,
    dto: ReviewLiquidationProofDto,
  ): Promise<{ message: string }> {
    return this.reviewLiquidationProofUc.execute(proofId, notarisId, dto);
  }

  listPendingLiquidationReviews(): Promise<LiquidationProofResponseDto[]> {
    return this.getPendingLiquidationReviewsUc.execute();
  }

  getAssetGuidance(
    assetId: string,
    userId: string,
  ): Promise<AssetGuidanceResponse> {
    return this.getAssetGuidanceUc.execute(assetId, userId);
  }

  rotateKeyShares(
    pewarisId: string,
    assetId: string,
    dto: RotateKeySharesDto,
  ): Promise<{ message: string; rotatedAt: Date }> {
    return this.rotateKeySharesUc.execute(pewarisId, assetId, dto);
  }

  requestLegalFallback(
    assetId: string,
    userId: string,
    dto: RequestLegalFallbackDto,
  ): Promise<LegalFallbackResponse> {
    return this.requestLegalFallbackUc.execute(assetId, userId, dto.reason);
  }

  createAsset(
    pewarisId: string,
    dto: CreateAssetDto,
  ): Promise<CreateAssetResponseDto> {
    return this.createAssetUc.execute(pewarisId, dto);
  }

  escrowNotarisShare(
    pewarisId: string,
    assetId: string,
    dto: EscrowNotarisShareDto,
  ): Promise<{ message: string }> {
    return this.escrowNotarisShareUc.execute(pewarisId, assetId, dto);
  }

  listMyAssets(pewarisId: string): Promise<AssetResponseDto[]> {
    return this.getMyAssetsUc.execute(pewarisId);
  }

  listPendingForNotaris(notarisId: string): Promise<AssetResponseDto[]> {
    return this.getPendingAssetsNotarisUc.execute(notarisId);
  }

  listHistoryForNotaris(notarisId: string): Promise<AssetResponseDto[]> {
    return this.getHistoryAssetsNotarisUc.execute(notarisId);
  }

  listAllocatedForAhliWaris(ahliWarisId: string): Promise<AssetResponseDto[]> {
    return this.getAllocatedAssetsAhliWarisUc.execute(ahliWarisId);
  }

  updateAsset(
    id: string,
    pewarisId: string,
    dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.updateAssetUc.execute(id, pewarisId, dto);
  }

  deleteAsset(id: string, pewarisId: string): Promise<void> {
    return this.deleteAssetUc.execute(id, pewarisId);
  }

  verifyAsset(id: string, notarisId: string): Promise<AssetResponseDto> {
    return this.verifyAssetUc.verify(id, notarisId);
  }

  rejectAsset(id: string, notarisId: string): Promise<AssetResponseDto> {
    return this.verifyAssetUc.reject(id, notarisId);
  }

  allocateAsset(
    pewarisId: string,
    assetId: string,
    dto: AllocateAssetDto,
  ): Promise<AssetAllocationResponseDto> {
    return this.allocateAssetUc.execute(pewarisId, assetId, dto);
  }

  unlockAsset(assetId: string, userId: string): Promise<UnlockAssetResponse> {
    return this.unlockAssetUc.execute(assetId, userId);
  }

  uploadLiquidationProof(
    assetId: string,
    executorId: string,
    dto: UploadLiquidationProofDto,
  ): Promise<{ message: string; proofId: string }> {
    return this.uploadLiquidationProofUc.execute(assetId, executorId, dto);
  }

  acknowledgeDistribution(
    assetId: string,
    ahliWarisId: string,
  ): Promise<{ message: string }> {
    return this.acknowledgeDistributionUc.execute(assetId, ahliWarisId);
  }

  closeAsset(
    assetId: string,
    notarisId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    return this.closeAssetUc.execute(assetId, notarisId, reason);
  }
}
