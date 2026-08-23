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

import {
  FORENSIC_VALIDATOR_TOKEN,
  type IForensicValidator,
} from '../services/forensic-validator.interface';

@Injectable()
export class UploadLiquidationProofUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @InjectRepository(LiquidationProofTypeOrmEntity)
    private readonly proofRepo: Repository<LiquidationProofTypeOrmEntity>,
    @Inject(FORENSIC_VALIDATOR_TOKEN)
    private readonly forensicValidator: IForensicValidator,
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

    // 4. Transisi awal: UNLOCKED → LIQUIDATING
    await this.assetRepo.update(assetId, { status: AssetStatus.LIQUIDATING });

    // 5. Simpan Liquidation Proof
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

    // 6. Jalankan AI Forensic Validator (Mock) secara sinkron untuk MVP
    // Dalam produksi nyata, ini mungkin dikirim ke Message Queue (RabbitMQ/Kafka)
    const validationResult = await this.forensicValidator.validateStatement(
      dto.pdfFileUrl,
      { from: asset.updatedAt, to: new Date() },
      dto.pdfPassword,
    );

    if (validationResult.isValid) {
      // Jika validasi sukses, update proof dan aset
      await this.proofRepo.update(saved.id, {
        status: LiquidationProofStatus.VALIDATED,
        validationNotes: validationResult.notes,
      });
      await this.assetRepo.update(assetId, { status: AssetStatus.DISTRIBUTED });

      return {
        message:
          'Bukti pencairan diunggah dan validasi AI berhasil. Status aset berubah menjadi DISTRIBUTED.',
        proofId: saved.id,
      };
    } else {
      // Jika validasi gagal (fraud detected)
      await this.proofRepo.update(saved.id, {
        status: LiquidationProofStatus.REJECTED,
        validationNotes: validationResult.notes,
      });
      await this.assetRepo.update(assetId, {
        status: AssetStatus.DISPUTED_LIQUIDATION,
      });

      return {
        message:
          'Peringatan: Validasi AI menemukan anomali. Status aset di-eskalasi menjadi DISPUTED_LIQUIDATION.',
        proofId: saved.id,
      };
    }
  }
}
