import { Inject, Injectable } from '@nestjs/common';
import { AssetResponseDto } from '../dto/asset-response.dto';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { AssetDomain } from '../../domains/entities/asset.entity';

@Injectable()
export class GetMyAssetsUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
  ) {}

  async execute(pewarisId: string): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepo.findByPewarisId(pewarisId);
    return assets.map((a) => this.toResponseDto(a));
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
