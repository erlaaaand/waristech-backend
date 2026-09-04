import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ASSET_REPOSITORY_TOKEN } from '../../domains/repositories/asset.repository.interface';
import type { IAssetRepository } from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { AssetNotifierService } from '../../applications/services/asset-notifier.service';
import { NotificationType } from '../../../shared/notifications/entities/notification.entity';

@Injectable()
export class InheritanceDisputedListener {
  private readonly logger = new Logger(InheritanceDisputedListener.name);

  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly notifier: AssetNotifierService,
  ) {}

  @OnEvent('inheritance.disputed')
  async handleInheritanceDisputedEvent(pewarisId: string) {
    this.logger.log(
      `Received inheritance.disputed event for pewarisId: ${pewarisId}`,
    );
    try {
      // Find all assets for this pewaris and freeze them
      const assets = await this.assetRepo.findByPewarisId(pewarisId);

      for (const asset of assets) {
        if (asset.status !== AssetStatus.FROZEN) {
          await this.assetRepo.update(asset.id, { status: AssetStatus.FROZEN });
          this.logger.log(`Froze asset ${asset.id} due to dispute`);

          await this.notifier.notifyAllocatedHeirs(
            asset.id,
            'Aset Dibekukan karena Sanggahan',
            `Ada saksi yang mengajukan sanggahan, sehingga aset "${asset.assetName}" dibekukan. ` +
              'Proses transisi dihentikan sampai sengketa diselesaikan bersama Notaris.',
            NotificationType.ERROR,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to freeze assets for pewarisId: ${pewarisId}`,
        error,
      );
    }
  }
}
