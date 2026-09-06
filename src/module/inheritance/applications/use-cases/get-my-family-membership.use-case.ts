import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import { MyFamilyMembershipResponseDto } from '../dto/inheritance-response.dto';

/**
 * Ahli Waris melihat status keanggotaan keluarganya sendiri (Pewaris yang
 * mengundangnya, hubungan, dan status verifikasi) — pelengkap
 * GET /inheritance/family-members yang khusus milik Pewaris.
 */
@Injectable()
export class GetMyFamilyMembershipUseCase {
  constructor(
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(ahliWarisId: string): Promise<MyFamilyMembershipResponseDto[]> {
    const memberships =
      await this.familyMemberRepo.findByAhliWarisId(ahliWarisId);

    return Promise.all(
      memberships.map(async (m) => {
        const pewaris = await this.userRepo.findById(m.pewarisId);
        return {
          id: m.id,
          pewarisId: m.pewarisId,
          pewarisName: pewaris?.fullName ?? null,
          ahliWarisId: m.ahliWarisId,
          ahliWarisName: null,
          relationshipType: m.relationshipType,
          relationshipDescription: m.relationshipDescription,
          status: m.status,
          supportingDocumentUrl: m.supportingDocumentUrl,
          verifiedByNotarisId: m.verifiedByNotarisId,
          verifiedAt: m.verifiedAt,
          createdAt: m.createdAt,
        };
      }),
    );
  }
}
