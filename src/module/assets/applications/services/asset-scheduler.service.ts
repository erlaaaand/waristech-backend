import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';
import { NotificationsService } from '../../../shared/notifications/notifications.service';
import { NotificationType } from '../../../shared/notifications/entities/notification.entity';
import { AssetNotifierService } from './asset-notifier.service';

/**
 * AssetSchedulerService
 *
 * Menjalankan tugas terjadwal:
 * 1. Mengingatkan Pewaris memperbarui password jika brankas tidak di-update > 6 bulan.
 * 2. Auto-escalate aset yang UNLOCKED/LIQUIDATING > 30 hari menjadi DISPUTED_LIQUIDATION.
 * 3. Membuka brankas (PENDING_COOLDOWN → UNLOCKED) setelah masa tunda 14 hari lewat tanpa sanggahan.
 */
@Injectable()
export class AssetSchedulerService {
  private readonly logger = new Logger(AssetSchedulerService.name);

  // 6 bulan dalam milidetik
  private readonly STALE_VAULT_THRESHOLD_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  // 30 hari dalam milidetik
  private readonly EXECUTOR_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    private readonly notifier: AssetNotifierService,
  ) {}

  /**
   * Cron mingguan — Pengingat rotasi kunci berkala (proposal 2.3.6, mitigasi #2).
   *
   * Aset VERIFIED yang bagian kuncinya tidak pernah dirotasi > 6 bulan akan
   * diberi notifikasi ke Pewaris agar menjalankan POST /assets/:id/rotate-shares.
   * Rotasi tidak dapat dipaksakan server karena penggabungan kunci hanya bisa
   * dilakukan klien — jadi yang bisa sistem lakukan adalah mengingatkan.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async handleStaleVaultReminder() {
    this.logger.log(
      '[CRON] Memeriksa brankas yang belum dirotasi > 6 bulan...',
    );
    const now = new Date();
    const threshold = new Date(now.getTime() - this.STALE_VAULT_THRESHOLD_MS);

    try {
      const staleAssets = await this.assetRepo.findStaleAssets(threshold);
      if (staleAssets.length === 0) {
        this.logger.log('[CRON] Tidak ada brankas usang.');
        return;
      }

      this.logger.log(
        `[CRON] Menemukan ${staleAssets.length} aset perlu rotasi kunci. Mengirim pengingat...`,
      );

      for (const asset of staleAssets) {
        await this.notificationsService.sendNotification({
          userId: asset.pewarisId,
          title: 'Saatnya Rotasi Kunci Aset',
          message:
            `Bagian kunci aset "${asset.assetName}" belum diperbarui lebih dari 6 bulan. ` +
            'Lakukan rotasi kunci agar bagian lama yang mungkin bocor tidak lagi berguna.',
          type: NotificationType.WARNING,
        });

        this.auditLogService.logAsync({
          action: AuditAction.KEY_ROTATION_REMINDER_SENT,
          category: AuditCategory.WARIS_ASSET,
          severity: AuditSeverity.INFO,
          actor: { userId: 'system' },
          resource: 'assets',
          resourceId: asset.id,
          description: `Pengingat rotasi kunci dikirim ke Pewaris (${asset.pewarisId}) untuk aset "${asset.assetName}".`,
        });
      }
    } catch (error) {
      this.logger.error(
        '[CRON] Gagal memproses pengingat rotasi kunci',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Cron: Setiap hari jam 02:00 — Cek timeout Eksekutor.
   * Jika aset berstatus UNLOCKED/LIQUIDATING lebih dari 30 hari,
   * otomatis eskalasi ke DISPUTED_LIQUIDATION.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExecutorTimeout() {
    this.logger.log('[CRON] Memeriksa timeout Eksekutor (> 30 hari)...');
    const now = new Date();
    const threshold = new Date(now.getTime() - this.EXECUTOR_TIMEOUT_MS);

    try {
      const staleAssets = await this.assetRepo.findStaleLiquidations(threshold);

      for (const asset of staleAssets) {
        await this.assetRepo.update(asset.id, {
          status: AssetStatus.DISPUTED_LIQUIDATION,
        });
        this.logger.warn(
          `[TIMEOUT] Aset ${asset.id} di-eskalasi ke DISPUTED_LIQUIDATION karena melebihi batas 30 hari.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[CRON] Gagal memeriksa timeout eksekutor`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Cron: Setiap jam — Cek aset yang masa tunda (cooling-off) 14 harinya sudah lewat.
   * Buka brankas (UNLOCKED) selama tidak ada sanggahan (dispute) yang membekukannya.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCooldownExpiry() {
    this.logger.log(
      '[CRON] Memeriksa aset dengan masa tunda yang sudah lewat...',
    );
    const now = new Date();

    try {
      const expiredAssets = await this.assetRepo.findExpiredCooldowns(now);

      for (const asset of expiredAssets) {
        await this.assetRepo.update(asset.id, {
          status: AssetStatus.UNLOCKED,
          cooldownEndsAt: null,
        });

        this.logger.log(
          `[COOLDOWN] Aset ${asset.id} dibuka (UNLOCKED) setelah masa tunda 14 hari selesai tanpa sanggahan.`,
        );

        await this.notifier.notifyAllocatedHeirs(
          asset.id,
          'Brankas Aset Telah Terbuka',
          `Masa tunda selesai tanpa sanggahan. Aset "${asset.assetName}" kini terbuka. ` +
            'Eksekutor dapat mengambil bagian kuncinya untuk memulai proses pencairan.',
          NotificationType.SUCCESS,
        );

        this.auditLogService.logAsync({
          action: AuditAction.ASSET_COOLDOWN_EXPIRED,
          category: AuditCategory.WARIS_ASSET,
          severity: AuditSeverity.WARNING,
          actor: { userId: 'system' },
          resource: 'assets',
          resourceId: asset.id,
          description: `Aset "${asset.assetName}" resmi dibuka (UNLOCKED) — masa tunda 14 hari selesai tanpa sanggahan.`,
        });
      }
    } catch (error) {
      this.logger.error(
        `[CRON] Gagal memproses masa tunda yang berakhir`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
