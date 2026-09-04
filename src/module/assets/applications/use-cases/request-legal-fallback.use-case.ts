import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  KEY_SHARE_REPOSITORY_TOKEN,
  type IKeyShareRepository,
} from '../../domains/repositories/key-share.repository.interface';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';
import { AssetNotFoundException } from '../../domains/exceptions/asset.exception';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';
import {
  InheritanceGuidanceService,
  type InheritanceGuidance,
} from '../../domains/services/inheritance-guidance.service';

export interface LegalFallbackResponse {
  assetId: string;
  assetName: string;
  platform: string;
  accountIdentifier: string;
  /** Bagian kunci yang masih tersedia di sisi server (maksimal 2: SYSTEM & titipan NOTARIS). */
  availableShareHolders: KeyShareHolder[];
  keyRecoveryPossible: boolean;
  explanation: string;
  guidance: InheritanceGuidance;
}

/**
 * Jalur pemulihan cadangan lewat hukum konvensional (proposal 2.3.6, mitigasi #3).
 *
 * PENTING & JUJUR: bila bagian kunci yang tersisa kurang dari 2, kredensial
 * SECARA MATEMATIS tidak dapat dipulihkan — tidak oleh sistem, tidak oleh
 * siapa pun. Skema Shamir memang dirancang demikian. Karena itu use-case ini
 * tidak berpura-pura "memulihkan kunci"; ia mengalihkan ahli waris ke jalur
 * resmi (Surat Keterangan Waris + prosedur lembaga terkait) dan mencatat
 * permohonan tersebut ke audit trail sebagai bukti bagi proses hukum.
 */
@Injectable()
export class RequestLegalFallbackUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(KEY_SHARE_REPOSITORY_TOKEN)
    private readonly keyShareRepo: IKeyShareRepository,
    private readonly guidanceService: InheritanceGuidanceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    assetId: string,
    requestingUserId: string,
    reason: string,
  ): Promise<LegalFallbackResponse> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) throw new AssetNotFoundException();

    const allocations = await this.assetRepo.findAllocationsByAssetId(assetId);
    const isAllocatedHeir = allocations.some(
      (a) => a.ahliWarisId === requestingUserId,
    );
    if (!asset.isOwnedBy(requestingUserId) && !isAllocatedHeir) {
      throw new ForbiddenException('Anda tidak memiliki hak atas aset ini.');
    }

    const shares = await this.keyShareRepo.findByAssetId(assetId);
    const availableShareHolders = shares.map((s) => s.holder);

    // Server memegang maksimal 2 bagian: SYSTEM + titipan NOTARIS (ciphertext).
    // Titipan Notaris hanya berguna bila Notaris membukanya dengan private key-nya.
    const keyRecoveryPossible = availableShareHolders.length >= 2;

    this.auditLogService.logAsync({
      action: AuditAction.LEGAL_FALLBACK_REQUESTED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.CRITICAL,
      actor: { userId: requestingUserId },
      resource: 'assets',
      resourceId: assetId,
      description: `Permohonan jalur hukum konvensional untuk aset "${asset.assetName}" oleh (${requestingUserId}). Alasan: ${reason}`,
      metadata: {
        reason,
        availableShareHolders,
        keyRecoveryPossible,
      },
    });

    return {
      assetId: asset.id,
      assetName: asset.assetName,
      platform: asset.platform,
      accountIdentifier: asset.accountIdentifier,
      availableShareHolders,
      keyRecoveryPossible,
      explanation: keyRecoveryPossible
        ? 'Masih tersedia bagian kunci Notaris di sistem. Hubungi Notaris agar mendekripsi bagian ' +
          'miliknya dengan private key, lalu gabungkan dengan bagian SYSTEM di sisi klien — ' +
          'kredensial masih dapat dipulihkan tanpa menempuh jalur pengadilan.'
        : 'Bagian kunci yang tersisa kurang dari 2, sehingga kredensial TIDAK DAPAT dipulihkan ' +
          'secara teknis oleh pihak mana pun — ini konsekuensi matematis skema Shamir, bukan ' +
          'kegagalan sistem. Tempuh jalur resmi di bawah: ajukan Surat Keterangan Waris, lalu ' +
          'urus pengalihan aset langsung ke lembaga penyelenggara platform. Catatan audit trail ' +
          'WarisTech (daftar aset, porsi pembagian, riwayat verifikasi) dapat dilampirkan sebagai bukti pendukung.',
      guidance: this.guidanceService.getGuidance(asset.type, asset.platform),
    };
  }
}
