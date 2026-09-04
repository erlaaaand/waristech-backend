import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  type IAssetRepository,
  ASSET_REPOSITORY_TOKEN,
} from '../../domains/repositories/asset.repository.interface';
import {
  type IKeyShareRepository,
  KEY_SHARE_REPOSITORY_TOKEN,
} from '../../domains/repositories/key-share.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { HeirsNotAcknowledgedException } from '../../domains/exceptions/asset.exception';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

/**
 * CloseAssetUseCase (Notaris Only)
 *
 * Menutup kasus warisan secara final dan melakukan Data Shredding:
 * encryptedSecret (skema lama) di-overwrite dengan random bytes lalu di-null-kan,
 * dan seluruh bagian kunci Secret Sharing (skema baru) dihapus permanen.
 * Ini memenuhi UU Pelindungan Data Pribadi (UU PDP).
 */
@Injectable()
export class CloseAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(KEY_SHARE_REPOSITORY_TOKEN)
    private readonly keyShareRepo: IKeyShareRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    assetId: string,
    notarisId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    // Hanya bisa ditutup dari status DISTRIBUTED atau DISPUTED_LIQUIDATION
    if (
      asset.status !== AssetStatus.DISTRIBUTED &&
      asset.status !== AssetStatus.DISPUTED_LIQUIDATION
    ) {
      throw new BadRequestException(
        'Kasus hanya bisa ditutup dari status DISTRIBUTED atau DISPUTED_LIQUIDATION. Status saat ini: ' +
          asset.status,
      );
    }

    // ── Gate: semua ahli waris non-eksekutor wajib acknowledge dulu ───────
    const unacknowledgedHeirIds = asset.getUnacknowledgedHeirIds();
    if (unacknowledgedHeirIds.length > 0) {
      if (!reason) {
        throw new HeirsNotAcknowledgedException(unacknowledgedHeirIds);
      }

      // Force-close: Notaris override gate dengan alasan wajib, dicatat penuh di audit trail.
      this.auditLogService.logAsync({
        action: AuditAction.ASSET_FORCE_CLOSED,
        category: AuditCategory.WARIS_ASSET,
        severity: AuditSeverity.WARNING,
        actor: { userId: notarisId },
        resource: 'assets',
        resourceId: assetId,
        description: `Notaris (${notarisId}) menutup paksa kasus aset "${asset.assetName}" meski ${unacknowledgedHeirIds.length} ahli waris belum acknowledge. Alasan: ${reason}`,
        metadata: { unacknowledgedHeirIds, reason },
      });
    }

    // ── DATA SHREDDING (Cryptographic Wipe) ──────────────────────────────
    // Kosongkan encryptedSecret & tutup status dalam SATU UPDATE atomik
    // bersyarat — tidak ada lagi jendela waktu antara "wipe" dan "tutup", dan
    // dua permintaan close bersamaan tidak bisa menutup kasus yang sama dua kali.
    await this.assetRepo.closeAndShred(assetId);

    // Hapus seluruh bagian kunci (Secret Sharing) — tanpa ini, data shredding
    // tidak lengkap untuk aset yang sudah memakai skema baru.
    await this.keyShareRepo.deleteByAssetId(assetId);

    return {
      message: `Kasus aset "${asset.assetName}" berhasil ditutup oleh Notaris (${notarisId}). Data rahasia telah dihancurkan secara permanen.`,
    };
  }
}
