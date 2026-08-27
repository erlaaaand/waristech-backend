import { Inject, Injectable } from '@nestjs/common';
import {
  type IAssetRepository,
  ASSET_REPOSITORY_TOKEN,
} from '../../domains/repositories/asset.repository.interface';
import { AssetResponseDto } from '../dto/asset-response.dto';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { AssetDomain } from '../../domains/entities/asset.entity';

@Injectable()
export class GetPendingAssetsNotarisUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly repository: IAssetRepository,
  ) {}

  async execute(): Promise<AssetResponseDto[]> {
    const pendingAssets = await this.repository.findByStatus(
      AssetStatus.PENDING_VERIFICATION,
    );
    return pendingAssets.map((asset) => this.toResponseDto(asset));
  }

  private toResponseDto(asset: AssetDomain): AssetResponseDto {
    return {
      id: asset.id,
      pewarisId: asset.pewarisId,
      type: asset.type,
      assetName: asset.assetName,
      platform: asset.platform,
      accountIdentifier: asset.accountIdentifier,
      status: asset.status,
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
