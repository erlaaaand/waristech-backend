import { Inject, Injectable } from '@nestjs/common';
import { AllocateAssetDto } from '../dto/allocate-asset.dto';
import { AssetAllocationResponseDto } from '../dto/asset-response.dto';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  AssetNotFoundException,
  AssetNotOwnedException,
  AssetAlreadyVerifiedException,
  AllocationDeviatesFromLegalSchemeException,
} from '../../domains/exceptions/asset.exception';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../../inheritance/domains/repositories/family-member.repository.interface';
import { FamilyMemberStatus } from '../../../inheritance/domains/entities/family-member.entity';
import { CalculationStrategyFactory } from '../../../calculation/applications/factories/calculation-strategy.factory';

/** Toleransi selisih (dalam poin persentase) sebelum dianggap "menyimpang". */
const DEVIATION_TOLERANCE = 0.5;

@Injectable()
export class AllocateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    private readonly calculationStrategyFactory: CalculationStrategyFactory,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    pewarisId: string,
    assetId: string,
    dto: AllocateAssetDto,
  ): Promise<AssetAllocationResponseDto> {
    const asset = await this.assetRepo.findById(assetId);

    if (!asset) throw new AssetNotFoundException();
    if (!asset.isOwnedBy(pewarisId)) throw new AssetNotOwnedException();
    if (asset.isVerified()) {
      throw new AssetAlreadyVerifiedException(
        'Aset yang sudah diverifikasi tidak dapat diubah alokasinya.',
      );
    }

    await this.assertMatchesLegalScheme(pewarisId, dto);

    const isExecutor = dto.isExecutor ?? false;
    // Validasi kapasitas alokasi & keunikan eksekutor dilakukan ULANG secara
    // atomik (row lock) di dalam allocateAtomic — pengecekan di atas hanya
    // untuk gagal cepat dengan pesan yang jelas pada kasus non-race.
    const allocation = await this.assetRepo.allocateAtomic(
      assetId,
      dto.ahliWarisId,
      dto.percentage,
      isExecutor,
    );

    this.auditLogService.logAsync({
      action: AuditAction.ASSET_UPDATED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId: pewarisId },
      resource: 'asset_allocations',
      resourceId: allocation.id,
      description: `Pewaris (${pewarisId}) mengalokasikan ${dto.percentage}% aset "${asset.assetName}" ke ahli waris (${dto.ahliWarisId}).${isExecutor ? ' [DITUNJUK SEBAGAI EKSEKUTOR]' : ''}`,
    });

    return {
      id: allocation.id,
      assetId: allocation.assetId,
      ahliWarisId: allocation.ahliWarisId,
      percentage: allocation.percentage,
      isExecutor: allocation.isExecutor,
      acknowledgedAt: allocation.acknowledgedAt,
      createdAt: allocation.createdAt,
    };
  }

  /**
   * Kalau Pewaris sudah menetapkan skema hukum waris pilihan (lihat GET /calculation/preference),
   * validasi persentase alokasi terhadap hasil hitungan skema tersebut. Menyimpang tanpa `reason`
   * akan ditolak — kalkulasi tetap "alat bantu pemahaman", bukan keputusan final hukum, jadi
   * Pewaris tetap boleh menyimpang selama memberi alasan (tercatat di audit trail).
   */
  private async assertMatchesLegalScheme(
    pewarisId: string,
    dto: AllocateAssetDto,
  ): Promise<void> {
    const pewaris = await this.userRepo.findById(pewarisId);
    if (!pewaris?.preferredCalculationMethod) {
      return; // Belum ada skema pilihan — tidak ada acuan untuk divalidasi.
    }

    const familyMembers =
      await this.familyMemberRepo.findByPewarisId(pewarisId);
    const confirmedMembers = familyMembers.filter((m) => {
      if (m.requiresDocumentVerification()) {
        return m.status === FamilyMemberStatus.VERIFIED;
      }
      return (
        m.status !== FamilyMemberStatus.PENDING_CONFIRMATION &&
        m.status !== FamilyMemberStatus.REJECTED
      );
    });

    const strategy = this.calculationStrategyFactory.getStrategy(
      pewaris.preferredCalculationMethod,
    );
    const shares = strategy.calculate(
      100,
      confirmedMembers.map((m) => ({
        ahliWarisId: m.ahliWarisId,
        relationshipDescription: m.relationshipDescription,
      })),
    );

    const expectedShare = shares.find((s) => s.ahliWarisId === dto.ahliWarisId);
    if (!expectedShare) {
      return; // Ahli waris ini belum masuk hitungan (belum dikonfirmasi) — tidak ada acuan.
    }

    const deviation = Math.abs(
      expectedShare.calculatedPercentage - dto.percentage,
    );
    if (deviation > DEVIATION_TOLERANCE && !dto.reason) {
      throw new AllocationDeviatesFromLegalSchemeException(
        expectedShare.calculatedPercentage,
        dto.percentage,
      );
    }

    if (deviation > DEVIATION_TOLERANCE && dto.reason) {
      this.auditLogService.logAsync({
        action: AuditAction.ASSET_ALLOCATION_OVERRIDDEN,
        category: AuditCategory.WARIS_ASSET,
        severity: AuditSeverity.WARNING,
        actor: { userId: pewarisId },
        resource: 'asset_allocations',
        description:
          `Pewaris (${pewarisId}) mengalokasikan ${dto.percentage}% ke ahli waris (${dto.ahliWarisId}), ` +
          `menyimpang dari hasil hitungan skema ${pewaris.preferredCalculationMethod} ` +
          `(seharusnya ${expectedShare.calculatedPercentage.toFixed(2)}%). Alasan: ${dto.reason}`,
        metadata: {
          method: pewaris.preferredCalculationMethod,
          expectedPercentage: expectedShare.calculatedPercentage,
          actualPercentage: dto.percentage,
          reason: dto.reason,
        },
      });
    }
  }
}
