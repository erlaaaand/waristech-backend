import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
  type IAssetRepository,
  ASSET_REPOSITORY_TOKEN,
} from '../../domains/repositories/asset.repository.interface';
import {
  type ISecretSharingService,
  SECRET_SHARING_SERVICE_TOKEN,
} from '../../domains/services/secret-sharing.service.interface';
import {
  type IKeyShareRepository,
  KEY_SHARE_REPOSITORY_TOKEN,
} from '../../domains/repositories/key-share.repository.interface';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

export interface UnlockAssetResponse {
  assetId: string;
  assetName: string;
  platform: string;
  accountIdentifier: string;
  role: 'EXECUTOR' | 'BENEFICIARY';
  percentageOwned: number;

  /**
   * Bagian kunci milik SYSTEM (mentah, siap digabung di klien).
   * Hanya diberikan kepada Eksekutor. Gabungkan dengan bagian EXECUTOR yang
   * tersimpan di perangkat Anda untuk memperoleh kredensial aset.
   */
  systemShare: string | null;

  /**
   * Bagian kunci Notaris dalam bentuk ciphertext (bila pernah dititipkan).
   * Server tidak dapat membukanya — hanya Notaris pemilik private key yang bisa.
   * Dipakai sebagai jalur cadangan bila bagian Eksekutor hilang.
   */
  notarisEncryptedShare: string | null;

  instruction: string;
}

/**
 * UnlockAssetUseCase
 *
 * PENTING: use-case ini TIDAK merekonstruksi kredensial. Ia hanya menyerahkan
 * bagian kunci milik SYSTEM kepada Eksekutor yang berhak. Penggabungan bagian
 * (Shamir combine) WAJIB dilakukan di sisi klien, sehingga kredensial aset tidak
 * pernah terbentuk utuh di memori server maupun melintas di jaringan.
 */
@Injectable()
export class UnlockAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(SECRET_SHARING_SERVICE_TOKEN)
    private readonly secretSharingService: ISecretSharingService,
    @Inject(KEY_SHARE_REPOSITORY_TOKEN)
    private readonly keyShareRepo: IKeyShareRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(assetId: string, userId: string): Promise<UnlockAssetResponse> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    if (asset.isGuidanceOnly()) {
      throw new BadRequestException(
        'Aset ini tidak menitipkan kredensial ke sistem. Gunakan GET /assets/:id/guidance ' +
          'untuk memperoleh panduan dokumen & langkah resmi di lembaga terkait.',
      );
    }

    // Brankas hanya bisa dibuka jika UNLOCKED atau sedang LIQUIDATING
    if (
      asset.status !== AssetStatus.UNLOCKED &&
      asset.status !== AssetStatus.LIQUIDATING
    ) {
      throw new BadRequestException(
        'Brankas aset belum terbuka. Status saat ini: ' + asset.status,
      );
    }

    // Verify authorization
    const allocations = await this.assetRepo.findAllocationsByAssetId(assetId);
    const userAllocation = allocations.find((a) => a.ahliWarisId === userId);

    if (!userAllocation) {
      throw new ForbiddenException('Anda tidak memiliki hak atas aset ini');
    }

    // Ahli waris non-eksekutor: lihat info aset, tidak menerima bagian kunci apa pun.
    if (!userAllocation.isExecutor) {
      return {
        assetId: asset.id,
        assetName: asset.assetName,
        platform: asset.platform,
        accountIdentifier: asset.accountIdentifier,
        role: 'BENEFICIARY',
        percentageOwned: userAllocation.percentage,
        systemShare: null,
        notarisEncryptedShare: null,
        instruction:
          'Anda penerima manfaat aset ini. Pencairan dilakukan oleh Eksekutor yang ditunjuk.',
      };
    }

    const systemKeyShare = await this.keyShareRepo.findByAssetIdAndHolder(
      assetId,
      KeyShareHolder.SYSTEM,
    );
    if (!systemKeyShare) {
      throw new BadRequestException(
        'Bagian kunci SYSTEM tidak ditemukan. Aset ini kemungkinan belum dimigrasi ke skema Secret Sharing — hubungi Notaris.',
      );
    }

    const notarisKeyShare = await this.keyShareRepo.findByAssetIdAndHolder(
      assetId,
      KeyShareHolder.NOTARIS,
    );

    this.auditLogService.logAsync({
      action: AuditAction.VAULT_SHARE_RELEASED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.WARNING,
      actor: { userId },
      resource: 'asset_key_shares',
      resourceId: assetId,
      description: `Bagian kunci SYSTEM aset "${asset.assetName}" diserahkan kepada Eksekutor (${userId}) untuk digabung di sisi klien.`,
    });

    return {
      assetId: asset.id,
      assetName: asset.assetName,
      platform: asset.platform,
      accountIdentifier: asset.accountIdentifier,
      role: 'EXECUTOR',
      percentageOwned: userAllocation.percentage,
      systemShare: this.secretSharingService.unsealSystemShare(
        systemKeyShare.getEncryptedShare(),
        assetId,
      ),
      notarisEncryptedShare: notarisKeyShare
        ? notarisKeyShare.getEncryptedShare()
        : null,
      instruction:
        'Gabungkan `systemShare` dengan bagian kunci Eksekutor yang tersimpan di perangkat Anda ' +
        'menggunakan Shamir combine DI SISI KLIEN. Bila bagian Eksekutor hilang, minta Notaris ' +
        'mendekripsi `notarisEncryptedShare` dengan private key miliknya sebagai penggantinya.',
    };
  }
}
