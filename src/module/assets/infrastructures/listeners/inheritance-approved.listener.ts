import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ASSET_REPOSITORY_TOKEN } from '../../domains/repositories/asset.repository.interface';
import type { IAssetRepository } from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';
import { AssetNotifierService } from '../../applications/services/asset-notifier.service';
import { NotificationType } from '../../../shared/notifications/entities/notification.entity';

/** Masa tunda (cooling-off) sebelum brankas benar-benar terbuka, memberi ruang sanggahan. */
const COOLDOWN_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class InheritanceApprovedListener {
  private readonly logger = new Logger(InheritanceApprovedListener.name);

  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly auditLogService: AuditLogService,
    private readonly notifier: AssetNotifierService,
  ) {}

  @OnEvent('inheritance.approved')
  async handleInheritanceApprovedEvent(pewarisId: string) {
    this.logger.log(
      `Received inheritance.approved event for pewarisId: ${pewarisId}`,
    );
    try {
      // Find all assets for this pewaris and start the 14-day cooling-off period
      const assets = await this.assetRepo.findByPewarisId(pewarisId);
      const cooldownEndsAt = new Date(Date.now() + COOLDOWN_DURATION_MS);

      for (const asset of assets) {
        if (
          asset.status !== AssetStatus.PENDING_COOLDOWN &&
          asset.status !== AssetStatus.UNLOCKED &&
          asset.status !== AssetStatus.FROZEN // If it was frozen, it needs manual override from notaris
        ) {
          await this.assetRepo.update(asset.id, {
            status: AssetStatus.PENDING_COOLDOWN,
            cooldownEndsAt,
          });
          this.logger.log(
            `Asset ${asset.id} masuk masa tunda 14 hari hingga ${cooldownEndsAt.toISOString()}`,
          );

          this.auditLogService.logAsync({
            action: AuditAction.ASSET_COOLDOWN_STARTED,
            category: AuditCategory.WARIS_ASSET,
            severity: AuditSeverity.INFO,
            actor: { userId: pewarisId },
            resource: 'assets',
            resourceId: asset.id,
            description: `Aset "${asset.assetName}" memasuki masa tunda 14 hari (berakhir ${cooldownEndsAt.toISOString()}) setelah verifikasi berjenjang disetujui.`,
          });

          // Beri tahu ahli waris bahwa masa sanggah 14 hari dimulai — ini jendela
          // waktu mereka untuk mengajukan keberatan sebelum brankas terbuka.
          await this.notifier.notifyAllocatedHeirs(
            asset.id,
            'Masa Tunda 14 Hari Dimulai',
            `Verifikasi telah disetujui seluruh saksi. Aset "${asset.assetName}" akan terbuka pada ` +
              `${cooldownEndsAt.toLocaleDateString('id-ID')}. Bila Anda keberatan, ajukan sanggahan sebelum tanggal tersebut.`,
            NotificationType.WARNING,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to start cooldown for pewarisId: ${pewarisId}`,
        error,
      );
    }
  }
}
