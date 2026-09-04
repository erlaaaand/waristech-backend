import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { AssetNotFoundException } from '../../domains/exceptions/asset.exception';
import {
  InheritanceGuidanceService,
  type InheritanceGuidance,
} from '../../domains/services/inheritance-guidance.service';

export interface AssetGuidanceResponse {
  assetId: string;
  assetName: string;
  platform: string;
  accountIdentifier: string;
  guidance: InheritanceGuidance;
}

/**
 * Panduan proses resmi untuk aset berkustodi GUIDANCE.
 * Dapat diakses Pewaris (pemilik) maupun Ahli Waris yang dialokasikan aset ini.
 */
@Injectable()
export class GetAssetGuidanceUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly guidanceService: InheritanceGuidanceService,
  ) {}

  async execute(
    assetId: string,
    userId: string,
  ): Promise<AssetGuidanceResponse> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) throw new AssetNotFoundException();

    if (!asset.isGuidanceOnly()) {
      throw new BadRequestException(
        'Aset ini berkustodi VAULT — kredensialnya dititipkan, gunakan GET /assets/:id/secret.',
      );
    }

    const isOwner = asset.isOwnedBy(userId);
    const allocations = await this.assetRepo.findAllocationsByAssetId(assetId);
    const isAllocatedHeir = allocations.some((a) => a.ahliWarisId === userId);

    if (!isOwner && !isAllocatedHeir) {
      throw new ForbiddenException('Anda tidak memiliki hak atas aset ini.');
    }

    return {
      assetId: asset.id,
      assetName: asset.assetName,
      platform: asset.platform,
      accountIdentifier: asset.accountIdentifier,
      guidance: this.guidanceService.getGuidance(asset.type, asset.platform),
    };
  }
}
