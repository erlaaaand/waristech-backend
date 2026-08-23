import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';

/**
 * AssetSchedulerService
 *
 * Menjalankan tugas terjadwal:
 * 1. Mengingatkan Pewaris memperbarui password jika brankas tidak di-update > 6 bulan.
 * 2. Auto-escalate aset yang UNLOCKED/LIQUIDATING > 30 hari menjadi DISPUTED_LIQUIDATION.
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
  ) {}

  /**
   * Cron: Setiap hari Senin jam 09:00 — Cek brankas usang.
   * Placeholder: Hanya log. Di produksi, kirim email ke Pewaris.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async handleStaleVaultReminder() {
    this.logger.log(
      '[CRON] Memeriksa brankas yang belum diperbarui > 6 bulan...',
    );
    const now = new Date();
    const threshold = new Date(now.getTime() - this.STALE_VAULT_THRESHOLD_MS);

    // Cari semua aset berstatus VERIFIED yang updatedAt < threshold
    // Karena findByPewarisId tidak cukup, kita perlu pendekatan berbeda.
    // Untuk MVP, kita log saja konsepnya.
    this.logger.log(
      `[CRON] Threshold tanggal: ${threshold.toISOString()}. Pewaris yang memiliki aset VERIFIED dengan updatedAt sebelum tanggal ini perlu diingatkan.`,
    );

    const staleAssets = await this.assetRepo.findStaleAssets(threshold);
    if (staleAssets.length > 0) {
      this.logger.log(
        `[CRON] Menemukan ${staleAssets.length} aset VERIFIED usang. Memicu event pengingat.`,
      );
      // TODO: Fire events for each asset.
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
}
