import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadLiquidationProofDto } from '../dto/upload-liquidation-proof.dto';
import {
  type IAssetRepository,
  ASSET_REPOSITORY_TOKEN,
} from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { LiquidationProofStatus } from '../../domains/enums/liquidation-proof.enum';
import { LiquidationProofTypeOrmEntity } from '../../infrastructures/entities/liquidation-proof.typeorm-entity';
import { AssetNotifierService } from '../services/asset-notifier.service';
import { NotificationType } from '../../../shared/notifications/entities/notification.entity';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';

/**
 * UploadLiquidationProofUseCase
 *
 * Eksekutor mengunggah bukti pencairan (e-Statement) + SPTJM. Verifikasi
 * keasliannya WAJIB dilakukan manual oleh Notaris (lihat ReviewLiquidationProofUseCase)
 * — tidak ada validasi otomatis di sini. Aset tetap di status LIQUIDATING sampai
 * Notaris memutuskan.
 */
@Injectable()
export class UploadLiquidationProofUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @InjectRepository(LiquidationProofTypeOrmEntity)
    private readonly proofRepo: Repository<LiquidationProofTypeOrmEntity>,
    private readonly notifier: AssetNotifierService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    assetId: string,
    executorId: string,
    dto: UploadLiquidationProofDto,
  ): Promise<{ message: string; proofId: string }> {
    // 1. Validasi SPTJM
    if (!dto.sptjmAgreed) {
      throw new BadRequestException(
        'Anda wajib menyetujui Surat Pernyataan Tanggung Jawab Mutlak (SPTJM).',
      );
    }

    // 2. Validasi aset
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    if (asset.status !== AssetStatus.UNLOCKED) {
      throw new BadRequestException(
        'Bukti pencairan hanya bisa diunggah saat status aset UNLOCKED. Status saat ini: ' +
          asset.status,
      );
    }

    // 3. Validasi bahwa user adalah Eksekutor
    const allocations = await this.assetRepo.findAllocationsByAssetId(assetId);
    const executorAllocation = allocations.find(
      (a) => a.ahliWarisId === executorId && a.isExecutor,
    );
    if (!executorAllocation) {
      throw new ForbiddenException(
        'Hanya Eksekutor yang ditunjuk yang berhak mengunggah bukti pencairan.',
      );
    }

    // 4. Transisi: UNLOCKED → LIQUIDATING (menunggu tinjauan Notaris)
    await this.assetRepo.update(assetId, { status: AssetStatus.LIQUIDATING });

    // 5. Simpan Liquidation Proof — menunggu tinjauan manual
    const proof = this.proofRepo.create({
      id: randomUUID(),
      assetId,
      executorId,
      pdfFileUrl: dto.pdfFileUrl,
      pdfPassword: dto.pdfPassword ?? null,
      sptjmAgreed: true,
      status: LiquidationProofStatus.PENDING_VALIDATION,
    });
    const saved = await this.proofRepo.save(proof);

    this.auditLogService.logAsync({
      action: AuditAction.LIQUIDATION_PROOF_UPLOADED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId: executorId },
      resource: 'liquidation_proofs',
      resourceId: saved.id,
      description: `Eksekutor (${executorId}) mengunggah bukti pencairan aset "${asset.assetName}". Menunggu tinjauan Notaris.`,
    });

    // 6. Beri tahu Notaris yang memverifikasi aset ini bahwa ada bukti menunggu tinjauan.
    if (asset.verifiedByNotarisId) {
      await this.notifier.notifyUser(
        asset.verifiedByNotarisId,
        'Bukti Pencairan Menunggu Tinjauan',
        `Eksekutor mengunggah bukti pencairan untuk aset "${asset.assetName}". ` +
          'Tinjau dokumennya dan putuskan validitasnya sebelum dana diteruskan ke ahli waris lain.',
        NotificationType.INFO,
      );
    }

    return {
      message:
        'Bukti pencairan berhasil diunggah dan menunggu tinjauan manual Notaris.',
      proofId: saved.id,
    };
  }
}
