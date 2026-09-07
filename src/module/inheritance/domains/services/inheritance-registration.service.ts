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
  supportingDocumentUrl?: string | null;
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
    // Catatan: kode undangan sudah DIKLAIM secara atomik (claimPending) oleh
    // pemanggil SEBELUM akun ahli waris dibuat — di sini tinggal mencatat
    // siapa yang menukarkannya.
    await this.invitationRepo.setRedeemedBy(
      payload.invitationCode,
      payload.ahliWarisId,
    );

    // Buat relasi FamilyMember
    await this.familyMemberRepo.create({
      id: payload.familyMemberId,
      pewarisId: payload.pewarisId,
      ahliWarisId: payload.ahliWarisId,
      relationshipType: payload.relationshipType,
      relationshipDescription: payload.relationshipDescription,
      supportingDocumentUrl: payload.supportingDocumentUrl,
    });
  }
}
