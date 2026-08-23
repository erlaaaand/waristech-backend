import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../../assets/domains/repositories/asset.repository.interface';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../../inheritance/domains/repositories/family-member.repository.interface';
import { AssetStatus } from '../../../assets/domains/enums/asset.enum';
import { FamilyMemberStatus } from '../../../inheritance/domains/enums/family-member.enum';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';

@Injectable()
export class GetDashboardUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
  ) {}

  async execute(pewarisId: string): Promise<DashboardResponseDto> {
    // Ambil data paralel ─ lebih efisien
    const [assets, familyMembers] = await Promise.all([
      this.assetRepo.findByPewarisId(pewarisId),
      this.familyMemberRepo.findByPewarisId(pewarisId),
    ]);

    // ── Ringkasan Aset ───────────────────────────────────────────────────────
    const verifiedAssets = assets.filter(
      (a) => a.status === AssetStatus.VERIFIED,
    );
    const pendingAssets = assets.filter(
      (a) => a.status === AssetStatus.PENDING_VERIFICATION,
    );
    const rejectedAssets = assets.filter(
      (a) => a.status === AssetStatus.REJECTED,
    );

    // ── Ringkasan Anggota Keluarga ───────────────────────────────────────────
    const verifiedMembers = familyMembers.filter(
      (m) => m.status === FamilyMemberStatus.VERIFIED,
    );
    const pendingConfirmation = familyMembers.filter(
      (m) => m.status === FamilyMemberStatus.PENDING_CONFIRMATION,
    );
    const pendingVerification = familyMembers.filter(
      (m) => m.status === FamilyMemberStatus.PENDING_VERIFICATION,
    );
    const rejectedMembers = familyMembers.filter(
      (m) => m.status === FamilyMemberStatus.REJECTED,
    );

    // ── Kesiapan Kalkulasi ───────────────────────────────────────────────────
    let isReadyToCalculate = false;
    let reason = '';

    if (verifiedAssets.length === 0) {
      reason = 'Belum ada harta warisan yang diverifikasi Notaris.';
    } else if (verifiedMembers.length === 0) {
      reason = 'Belum ada ahli waris sah yang dikonfirmasi/diverifikasi.';
    } else {
      isReadyToCalculate = true;
      reason = `Siap: ${verifiedAssets.length} aset terverifikasi, ${verifiedMembers.length} ahli waris sah.`;
    }

    return {
      pewarisId,
      assets: {
        total: assets.length,
        verified: verifiedAssets.length,
        pending: pendingAssets.length,
        rejected: rejectedAssets.length,
      },
      familyMembers: {
        total: familyMembers.length,
        verified: verifiedMembers.length,
        pendingConfirmation: pendingConfirmation.length,
        pendingVerification: pendingVerification.length,
        rejected: rejectedMembers.length,
      },
      calculationReadiness: { isReadyToCalculate, reason },
    };
  }
}
