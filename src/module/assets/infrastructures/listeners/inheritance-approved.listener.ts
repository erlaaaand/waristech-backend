import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ASSET_REPOSITORY_TOKEN } from '../../domains/repositories/asset.repository.interface';
import type { IAssetRepository } from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';

@Injectable()
export class InheritanceApprovedListener {
  private readonly logger = new Logger(InheritanceApprovedListener.name);

  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
  ) {}

  @OnEvent('inheritance.approved')
  async handleInheritanceApprovedEvent(pewarisId: string) {
    this.logger.log(
      `Received inheritance.approved event for pewarisId: ${pewarisId}`,
    );
    try {
      // Find all assets for this pewaris and unlock them
      const assets = await this.assetRepo.findByPewarisId(pewarisId);

      for (const asset of assets) {
        if (
          asset.status !== AssetStatus.UNLOCKED &&
          asset.status !== AssetStatus.FROZEN // If it was frozen, it needs manual override from notaris
        ) {
          await this.assetRepo.update(asset.id, {
            status: AssetStatus.UNLOCKED,
          });
          this.logger.log(
            `Unlocked asset ${asset.id} due to full witness approval`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to unlock assets for pewarisId: ${pewarisId}`,
        error,
      );
    }
  }
}
