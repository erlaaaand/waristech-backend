import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { NotificationsService } from '../../../shared/notifications/notifications.service';
import { NotificationType } from '../../../shared/notifications/entities/notification.entity';

/**
 * Memberitahu para pihak pada momen-momen penting siklus aset.
 *
 * Tanpa ini, ahli waris harus memeriksa aplikasi secara manual untuk tahu
 * brankas sudah terbuka atau eksekutor sudah mencairkan — melubangi janji
 * transparansi yang menjadi nilai utama WarisTech.
 */
@Injectable()
export class AssetNotifierService {
  private readonly logger = new Logger(AssetNotifierService.name);

  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Kirim notifikasi ke seluruh ahli waris yang dialokasikan pada aset ini.
   * @param excludeUserId Lewati satu pihak (mis. pelaku aksi itu sendiri).
   */
  async notifyAllocatedHeirs(
    assetId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
    excludeUserId?: string,
  ): Promise<void> {
    try {
      const allocations =
        await this.assetRepo.findAllocationsByAssetId(assetId);

      for (const allocation of allocations) {
        if (excludeUserId && allocation.ahliWarisId === excludeUserId) continue;

        await this.notificationsService.sendNotification({
          userId: allocation.ahliWarisId,
          title,
          message,
          type,
        });
      }
    } catch (error) {
      // Notifikasi tidak boleh menggagalkan alur bisnis utama.
      this.logger.error(
        `Gagal mengirim notifikasi ahli waris untuk aset ${assetId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Notifikasi ke Pewaris pemilik aset. */
  async notifyPewaris(
    pewarisId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
  ): Promise<void> {
    return this.notifyUser(pewarisId, title, message, type);
  }

  /** Notifikasi ke satu pengguna mana pun (mis. Notaris) berdasarkan userId. */
  async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
  ): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        userId,
        title,
        message,
        type,
      });
    } catch (error) {
      this.logger.error(
        `Gagal mengirim notifikasi ke pengguna ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
