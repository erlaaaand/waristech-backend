import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import { FamilyMemberResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class GetFamilyMembersUseCase {
  constructor(
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
  ) {}

  async execute(pewarisId: string): Promise<FamilyMemberResponseDto[]> {
    const members = await this.familyMemberRepo.findByPewarisId(pewarisId);

    return members.map((m) => ({
      id: m.id,
      pewarisId: m.pewarisId,
      ahliWarisId: m.ahliWarisId,
      relationshipType: m.relationshipType,
      relationshipDescription: m.relationshipDescription,
      status: m.status,
      supportingDocumentUrl: m.supportingDocumentUrl,
      verifiedByNotarisId: m.verifiedByNotarisId,
      verifiedAt: m.verifiedAt,
      createdAt: m.createdAt,
    }));
  }
}
