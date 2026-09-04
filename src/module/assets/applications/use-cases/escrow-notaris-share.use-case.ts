import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  KEY_SHARE_REPOSITORY_TOKEN,
  type IKeyShareRepository,
} from '../../domains/repositories/key-share.repository.interface';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';
import {
  AssetNotFoundException,
  AssetNotOwnedException,
} from '../../domains/exceptions/asset.exception';
import { EscrowNotarisShareDto } from '../dto/escrow-notaris-share.dto';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

/**
 * Menitipkan bagian kunci milik Notaris ke server DALAM BENTUK CIPHERTEXT.
 *
 * Enkripsi dilakukan sepenuhnya di sisi klien memakai public key Notaris —
 * server hanya menyimpan hasilnya dan tidak punya private key untuk membukanya.
 * Dengan begitu server tetap hanya memegang 1 bagian yang bisa ia baca (SYSTEM).
 */
@Injectable()
export class EscrowNotarisShareUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(KEY_SHARE_REPOSITORY_TOKEN)
    private readonly keyShareRepo: IKeyShareRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    pewarisId: string,
    assetId: string,
    dto: EscrowNotarisShareDto,
  ): Promise<{ message: string }> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) throw new AssetNotFoundException();
    if (!asset.isOwnedBy(pewarisId)) throw new AssetNotOwnedException();

    const existing = await this.keyShareRepo.findByAssetIdAndHolder(
      assetId,
      KeyShareHolder.NOTARIS,
    );
    if (existing) {
      throw new ConflictException(
        'Bagian kunci Notaris untuk aset ini sudah dititipkan sebelumnya dan tidak dapat ditimpa.',
      );
    }

    await this.keyShareRepo.createMany(assetId, [
      {
        holder: KeyShareHolder.NOTARIS,
        encryptedShare: dto.encryptedShare,
      },
    ]);

    this.auditLogService.logAsync({
      action: AuditAction.NOTARIS_SHARE_ESCROWED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.INFO,
      actor: { userId: pewarisId },
      resource: 'asset_key_shares',
      resourceId: assetId,
      description: `Pewaris (${pewarisId}) menitipkan bagian kunci terenkripsi untuk Notaris (${dto.notarisId}) pada aset "${asset.assetName}".`,
      metadata: { notarisId: dto.notarisId },
    });

    return {
      message:
        'Bagian kunci Notaris berhasil dititipkan dalam bentuk terenkripsi. Server tidak dapat membukanya.',
    };
  }
}
