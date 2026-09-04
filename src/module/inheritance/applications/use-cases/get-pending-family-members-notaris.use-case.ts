import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import { FamilyMemberStatus } from '../../domains/entities/family-member.entity';
import { FamilyMemberResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class GetPendingFamilyMembersNotarisUseCase {
  constructor(
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly repository: IFamilyMemberRepository,
  ) {}

  async execute(): Promise<FamilyMemberResponseDto[]> {
    const pending = await this.repository.findByStatus(
      FamilyMemberStatus.PENDING_VERIFICATION,
    );

    return pending.map((m) => ({
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
