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
import { UploadLiquidationProofDto } from '../dto/upload-liquidation-proof.dto';
import { AssetAllocationResponseDto } from '../dto/asset-response.dto';

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
  ) {}

  createAsset(
    pewarisId: string,
    dto: CreateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.createAssetUc.execute(pewarisId, dto);
  }

  listMyAssets(pewarisId: string): Promise<AssetResponseDto[]> {
    return this.getMyAssetsUc.execute(pewarisId);
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

  closeAsset(assetId: string, notarisId: string): Promise<{ message: string }> {
    return this.closeAssetUc.execute(assetId, notarisId);
  }
}
