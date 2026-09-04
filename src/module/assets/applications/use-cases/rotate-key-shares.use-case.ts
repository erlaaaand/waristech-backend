import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  KEY_SHARE_REPOSITORY_TOKEN,
  type IKeyShareRepository,
} from '../../domains/repositories/key-share.repository.interface';
import {
  SECRET_SHARING_SERVICE_TOKEN,
  type ISecretSharingService,
} from '../../domains/services/secret-sharing.service.interface';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';
import {
  AssetNotFoundException,
  AssetNotOwnedException,
} from '../../domains/exceptions/asset.exception';
import { RotateKeySharesDto } from '../dto/rotate-key-shares.dto';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

/**
 * Rotasi berkala bagian kunci (proposal 2.3.6, mitigasi risiko #2).
 *
 * Karena server tidak lagi mampu merekonstruksi kredensial, rotasi WAJIB
 * digerakkan klien: klien menggabungkan bagian yang ia pegang, memecah ulang
 * rahasianya menjadi 3 bagian baru, lalu menyetorkan bagian SYSTEM yang baru
 * ke sini. Bagian lama dihapus total sehingga bagian yang pernah bocor menjadi
 * tidak berguna — inilah manfaat utama rotasi.
 */
@Injectable()
export class RotateKeySharesUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(KEY_SHARE_REPOSITORY_TOKEN)
    private readonly keyShareRepo: IKeyShareRepository,
    @Inject(SECRET_SHARING_SERVICE_TOKEN)
    private readonly secretSharingService: ISecretSharingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    pewarisId: string,
    assetId: string,
    dto: RotateKeySharesDto,
  ): Promise<{ message: string; rotatedAt: Date }> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) throw new AssetNotFoundException();
    if (!asset.isOwnedBy(pewarisId)) throw new AssetNotOwnedException();

    if (asset.isGuidanceOnly()) {
      throw new BadRequestException(
        'Aset berkustodi GUIDANCE tidak menyimpan bagian kunci, sehingga tidak ada yang perlu dirotasi.',
      );
    }

    // Ganti seluruh bagian lama — bagian yang pernah bocor jadi tidak berguna.
    await this.keyShareRepo.deleteByAssetId(assetId);

    const newShares = [
      {
        holder: KeyShareHolder.SYSTEM,
        encryptedShare: this.secretSharingService.sealSystemShare(
          dto.newSystemShare,
          assetId,
        ),
      },
    ];

    if (dto.newNotarisEncryptedShare) {
      newShares.push({
        holder: KeyShareHolder.NOTARIS,
        encryptedShare: dto.newNotarisEncryptedShare,
      });
    }

    await this.keyShareRepo.createMany(assetId, newShares);

    const rotatedAt = new Date();
    // Reset penanda usia kunci agar cron pengingat berhenti menagih aset ini.
    await this.assetRepo.update(assetId, { keysRotatedAt: rotatedAt });
    this.auditLogService.logAsync({
      action: AuditAction.KEY_SHARES_ROTATED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.WARNING,
      actor: { userId: pewarisId },
      resource: 'asset_key_shares',
      resourceId: assetId,
      description: `Pewaris (${pewarisId}) merotasi bagian kunci aset "${asset.assetName}". Seluruh bagian lama dihapus permanen.`,
      metadata: {
        notarisShareRotated: Boolean(dto.newNotarisEncryptedShare),
        rotatedAt: rotatedAt.toISOString(),
      },
    });

    return {
      message:
        'Bagian kunci berhasil dirotasi. Pastikan bagian Eksekutor yang BARU sudah tersimpan di perangkat — bagian lama kini tidak berlaku.',
      rotatedAt,
    };
  }
}
