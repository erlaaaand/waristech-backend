import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import { FamilyMemberStatus } from '../../domains/entities/family-member.entity';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import { FamilyMemberResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class GetPendingFamilyMembersNotarisUseCase {
  constructor(
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly repository: IFamilyMemberRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(): Promise<FamilyMemberResponseDto[]> {
    const pending = await this.repository.findByStatus(
      FamilyMemberStatus.PENDING_VERIFICATION,
    );

    return Promise.all(
      pending.map(async (m) => {
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
