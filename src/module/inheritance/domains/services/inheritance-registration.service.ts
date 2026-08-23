import { Inject, Injectable } from '@nestjs/common';
import {
  INVITATION_REPOSITORY_TOKEN,
  type IInvitationRepository,
} from '../repositories/invitation.repository.interface';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../repositories/family-member.repository.interface';
import { RelationshipType } from '../enums/family-member.enum';

export interface AhliWarisRegistrationPayload {
  invitationCode: string;
  ahliWarisId: string;
  pewarisId: string;
  familyMemberId: string;
  relationshipType: RelationshipType;
  relationshipDescription: string;
}

@Injectable()
export class InheritanceRegistrationService {
  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
  ) {}

  async completeAhliWarisRegistration(
    payload: AhliWarisRegistrationPayload,
  ): Promise<void> {
    // 1. Tandai kode undangan sebagai sudah digunakan
    await this.invitationRepo.markAsUsed(
      payload.invitationCode,
      payload.ahliWarisId,
    );

    // 2. Buat relasi FamilyMember
    await this.familyMemberRepo.create({
      id: payload.familyMemberId,
      pewarisId: payload.pewarisId,
      ahliWarisId: payload.ahliWarisId,
      relationshipType: payload.relationshipType,
      relationshipDescription: payload.relationshipDescription,
    });
  }
}
