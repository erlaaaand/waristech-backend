import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiquidationProofTypeOrmEntity } from '../../infrastructures/entities/liquidation-proof.typeorm-entity';
import { LiquidationProofStatus } from '../../domains/enums/liquidation-proof.enum';
import { LiquidationProofResponseDto } from '../dto/liquidation-proof-response.dto';

/**
 * Daftar bukti pencairan yang menunggu tinjauan manual Notaris.
 * Menggantikan validasi otomatis AI — Notaris membuka `pdfFileUrl` (dengan
 * `pdfPassword` bila terkunci) dan memutuskan sendiri keabsahannya.
 */
@Injectable()
export class GetPendingLiquidationReviewsUseCase {
  constructor(
    @InjectRepository(LiquidationProofTypeOrmEntity)
    private readonly proofRepo: Repository<LiquidationProofTypeOrmEntity>,
  ) {}

  async execute(): Promise<LiquidationProofResponseDto[]> {
    const proofs = await this.proofRepo.find({
      where: { status: LiquidationProofStatus.PENDING_VALIDATION },
      relations: { asset: true },
      order: { createdAt: 'ASC' },
    });

    return proofs.map((p) => ({
      id: p.id,
      assetId: p.assetId,
      assetName: p.asset?.assetName ?? '(tidak diketahui)',
      executorId: p.executorId,
      pdfFileUrl: p.pdfFileUrl,
      pdfPassword: p.pdfPassword,
      status: p.status,
      validationNotes: p.validationNotes,
      createdAt: p.createdAt,
    }));
  }
}
