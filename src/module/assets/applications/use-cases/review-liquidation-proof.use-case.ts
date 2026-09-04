import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { LiquidationProofStatus } from '../../domains/enums/liquidation-proof.enum';
import { LiquidationProofTypeOrmEntity } from '../../infrastructures/entities/liquidation-proof.typeorm-entity';
import {
  ReviewLiquidationProofDto,
  LiquidationReviewDecision,
} from '../dto/review-liquidation-proof.dto';
import { AssetNotifierService } from '../services/asset-notifier.service';
import { NotificationType } from '../../../shared/notifications/entities/notification.entity';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

/**
 * ReviewLiquidationProofUseCase (Notaris Only)
 *
 * Menggantikan validasi otomatis AI yang sudah dihapus (wt-ai): keputusan atas
 * sah-tidaknya bukti pencairan SELALU diambil manusia yang bertanggung jawab
 * secara profesi, bukan model klasifikasi gambar yang tidak bisa mendeteksi
 * pemalsuan. Keputusan REJECT wajib disertai alasan tertulis.
 */
@Injectable()
export class ReviewLiquidationProofUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @InjectRepository(LiquidationProofTypeOrmEntity)
    private readonly proofRepo: Repository<LiquidationProofTypeOrmEntity>,
    private readonly notifier: AssetNotifierService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    proofId: string,
    notarisId: string,
    dto: ReviewLiquidationProofDto,
  ): Promise<{ message: string }> {
    const proof = await this.proofRepo.findOne({ where: { id: proofId } });
    if (!proof) {
      throw new NotFoundException('Bukti pencairan tidak ditemukan.');
    }

    if (proof.status !== LiquidationProofStatus.PENDING_VALIDATION) {
      throw new ConflictException(
        `Bukti pencairan ini sudah ditinjau sebelumnya (status: ${proof.status}).`,
      );
    }

    const asset = await this.assetRepo.findById(proof.assetId);
    if (!asset) {
      throw new NotFoundException('Aset terkait tidak ditemukan.');
    }

    if (dto.decision === LiquidationReviewDecision.APPROVE) {
      // UPDATE bersyarat (WHERE status = PENDING_VALIDATION) — dua review
      // notaris yang hampir bersamaan pada bukti yang sama tidak boleh
      // sama-sama lolos setelah pengecekan status di atas (TOCTOU).
      const result = await this.proofRepo.update(
        { id: proof.id, status: LiquidationProofStatus.PENDING_VALIDATION },
        {
          status: LiquidationProofStatus.VALIDATED,
          validationNotes: dto.notes ?? 'Disetujui oleh Notaris.',
        },
      );
      if (!result.affected) {
        throw new ConflictException(
          'Bukti pencairan ini sudah ditinjau oleh permintaan lain.',
        );
      }
      await this.assetRepo.update(asset.id, {
        status: AssetStatus.DISTRIBUTED,
      });

      this.auditLogService.logAsync({
        action: AuditAction.LIQUIDATION_PROOF_APPROVED,
        category: AuditCategory.WARIS_ASSET,
        severity: AuditSeverity.INFO,
        actor: { userId: notarisId },
        resource: 'liquidation_proofs',
        resourceId: proof.id,
        description: `Notaris (${notarisId}) menyetujui bukti pencairan aset "${asset.assetName}". ${dto.notes ? `Catatan: ${dto.notes}` : ''}`,
      });

      await this.notifier.notifyAllocatedHeirs(
        asset.id,
        'Bukti Pencairan Disetujui Notaris',
        `Notaris telah meninjau dan menyetujui bukti pencairan aset "${asset.assetName}". ` +
          'Periksa dana yang Anda terima, lalu konfirmasi penerimaan bagian Anda di aplikasi.',
        NotificationType.SUCCESS,
      );

      return {
        message:
          'Bukti pencairan disetujui. Aset berpindah ke status DISTRIBUTED.',
      };
    }

    // REJECT
    const rejectResult = await this.proofRepo.update(
      { id: proof.id, status: LiquidationProofStatus.PENDING_VALIDATION },
      {
        status: LiquidationProofStatus.REJECTED,
        validationNotes: dto.notes ?? null,
      },
    );
    if (!rejectResult.affected) {
      throw new ConflictException(
        'Bukti pencairan ini sudah ditinjau oleh permintaan lain.',
      );
    }
    await this.assetRepo.update(asset.id, {
      status: AssetStatus.DISPUTED_LIQUIDATION,
    });

    this.auditLogService.logAsync({
      action: AuditAction.LIQUIDATION_PROOF_REJECTED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.WARNING,
      actor: { userId: notarisId },
      resource: 'liquidation_proofs',
      resourceId: proof.id,
      description: `Notaris (${notarisId}) menolak bukti pencairan aset "${asset.assetName}". Alasan: ${dto.notes}`,
      metadata: { reason: dto.notes },
    });

    await this.notifier.notifyAllocatedHeirs(
      asset.id,
      'Bukti Pencairan Ditolak Notaris',
      `Notaris menilai bukti pencairan aset "${asset.assetName}" tidak meyakinkan. Alasan: ${dto.notes}. ` +
        'Kasus dieskalasi untuk ditinjau lebih lanjut. Jangan lakukan tindakan apa pun sebelum ada keputusan.',
      NotificationType.ERROR,
    );

    return {
      message:
        'Bukti pencairan ditolak. Aset dieskalasi ke status DISPUTED_LIQUIDATION.',
    };
  }
}
