import { Inject, Injectable } from '@nestjs/common';
import {
  type IAssetRepository,
  ASSET_REPOSITORY_TOKEN,
} from '../../domains/repositories/asset.repository.interface';
import { AssetResponseDto } from '../dto/asset-response.dto';
import { AssetDomain } from '../../domains/entities/asset.entity';
import { AssetStatus } from '../../domains/enums/asset.enum';

@Injectable()
export class GetHistoryAssetsNotarisUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly repository: IAssetRepository,
  ) {}

  async execute(notarisId: string): Promise<AssetResponseDto[]> {
    const historyAssets =
      await this.repository.findByAssignedNotarisIdAndStatuses(notarisId, [
        AssetStatus.VERIFIED,
        AssetStatus.REJECTED,
        AssetStatus.FROZEN,
        AssetStatus.UNLOCKED,
        AssetStatus.LIQUIDATING,
        AssetStatus.DISTRIBUTED,
        AssetStatus.DISPUTED_LIQUIDATION,
        AssetStatus.CLOSED,
      ]);

    return historyAssets.map((asset) => this.toResponseDto(asset));
  }

  private toResponseDto(asset: AssetDomain): AssetResponseDto {
    return {
      id: asset.id,
      pewarisId: asset.pewarisId,
      type: asset.type,
      assetName: asset.assetName,
      platform: asset.platform,
      accountIdentifier: asset.accountIdentifier,
      custodyType: asset.custodyType,
      status: asset.status,
      assignedNotarisId: asset.assignedNotarisId,
      verifiedByNotarisId: asset.verifiedByNotarisId,
      verifiedAt: asset.verifiedAt,
      allocations: asset.allocations.map((a) => ({
        id: a.id,
        assetId: a.assetId,
        ahliWarisId: a.ahliWarisId,
        percentage: a.percentage,
        isExecutor: a.isExecutor,
        acknowledgedAt: a.acknowledgedAt,
        createdAt: a.createdAt,
      })),
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
