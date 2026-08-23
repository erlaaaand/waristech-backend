import { Inject, Injectable } from '@nestjs/common';
import { SimulateCalculationDto } from '../dto/simulate-calculation.dto';
import { CalculationResponseDto } from '../dto/calculation-response.dto';
import { CalculationStrategyFactory } from '../factories/calculation-strategy.factory';
import { InsufficientDataForCalculationException } from '../../domains/exceptions/calculation.exception';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';

// Dependencies dari modul lain via DI Tokens
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../../assets/domains/repositories/asset.repository.interface';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../../inheritance/domains/repositories/family-member.repository.interface';
import { FamilyMemberStatus } from '../../../inheritance/domains/entities/family-member.entity';

@Injectable()
export class SimulateDistributionUseCase {
  constructor(
    private readonly strategyFactory: CalculationStrategyFactory,
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    pewarisId: string,
    dto: SimulateCalculationDto,
  ): Promise<CalculationResponseDto> {
    // 1. Dapatkan semua aset terverifikasi
    const assets = await this.assetRepo.findByPewarisId(pewarisId);
    const verifiedAssets = assets.filter((a) => a.isVerified());

    if (verifiedAssets.length === 0) {
      throw new InsufficientDataForCalculationException(
        'Tidak ada harta warisan yang sudah diverifikasi oleh Notaris.',
      );
    }

    const baseUnit = 100; // Simulasi menggunakan unit 100% (tidak menggunakan nominal rupiah)

    // 2. Dapatkan anggota keluarga terkonfirmasi/terverifikasi
    const familyMembers =
      await this.familyMemberRepo.findByPewarisId(pewarisId);
    const validMembers = familyMembers.filter((m) => {
      // NASAB cukup PENDING_VERIFICATION/VERIFIED (karena Pewaris bisa langsung konfirmasi)
      // Non-NASAB wajib VERIFIED Notaris
      if (m.requiresDocumentVerification()) {
        return m.status === FamilyMemberStatus.VERIFIED;
      }
      return (
        m.status !== FamilyMemberStatus.PENDING_CONFIRMATION &&
        m.status !== FamilyMemberStatus.REJECTED
      );
    });

    if (validMembers.length === 0) {
      throw new InsufficientDataForCalculationException(
        'Belum ada anggota keluarga/ahli waris sah yang disetujui.',
      );
    }

    const memberInputs = validMembers.map((m) => ({
      ahliWarisId: m.ahliWarisId,
      relationshipDescription: m.relationshipDescription,
    }));

    // 3. Tentukan Strategi Perhitungan dan Eksekusi
    const strategy = this.strategyFactory.getStrategy(dto.method);
    const shares = strategy.calculate(baseUnit, memberInputs, {
      customaryRatios: dto.customaryRatios,
    });

    // 4. Return format simulasi (belum disimpan ke DB)
    const result: CalculationResponseDto = {
      pewarisId,
      method: dto.method,
      baseUnit: baseUnit, // Menggunakan persentase (100) sebagai total
      shares: shares.map((s) => ({
        ahliWarisId: s.ahliWarisId,
        relationshipDescription: s.relationshipDescription,
        ratio: s.ratio,
        calculatedPercentage: s.calculatedPercentage,
      })),
    };

    // Audit Trail: Catat setiap simulasi perhitungan
    this.auditLogService.logAsync({
      action: AuditAction.WARIS_CALCULATION_SIMULATED,
      category: AuditCategory.WARIS_CALCULATION,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId: pewarisId },
      resource: 'calculation',
      description: `Pewaris (${pewarisId}) mensimulasikan pembagian waris metode ${dto.method}. Jumlah Ahli Waris: ${validMembers.length}.`,
      metadata: {
        method: dto.method,
        baseUnit,
        ahliWarisCount: validMembers.length,
      },
    });

    return result;
  }
}
