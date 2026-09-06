import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import { FamilyMemberResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class GetFamilyMembersUseCase {
  constructor(
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(pewarisId: string): Promise<FamilyMemberResponseDto[]> {
    const members = await this.familyMemberRepo.findByPewarisId(pewarisId);

    return Promise.all(
      members.map(async (m) => {
        const ahliWaris = await this.userRepo.findById(m.ahliWarisId);
        return {
          id: m.id,
          pewarisId: m.pewarisId,
          ahliWarisId: m.ahliWarisId,
          ahliWarisName: ahliWaris?.fullName ?? null,
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
