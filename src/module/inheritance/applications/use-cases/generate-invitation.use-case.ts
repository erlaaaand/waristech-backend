import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GenerateInvitationDto } from '../dto/generate-invitation.dto';
import {
  INVITATION_REPOSITORY_TOKEN,
  type IInvitationRepository,
} from '../../domains/repositories/invitation.repository.interface';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import { InvitationCodeService } from '../../domains/services/invitation-code.service';
import { RelationshipType } from '../../domains/entities/family-member.entity';
import { InvitationResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class GenerateInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    private readonly invitationCodeService: InvitationCodeService,
  ) {}

  async execute(
    pewarisId: string,
    dto: GenerateInvitationDto,
  ): Promise<InvitationResponseDto> {
    // 1. Validasi: jika NON_NASAB wajib ada dokumen pendukung
    if (
      dto.relationshipType === RelationshipType.NON_NASAB &&
      !dto.supportingDocumentUrl
    ) {
      throw new Error(
        'Hubungan Non-Nasab wajib menyertakan URL dokumen pendukung (Surat Wasiat/Hibah).',
      );
    }

    // 2. Buat kode undangan unik & set kedaluwarsa 7 hari
    const code = this.invitationCodeService.generateCode();
    const expiresAt = this.invitationCodeService.calculateExpiration(7);

    // 3. Simpan ke database
    const invitation = await this.invitationRepo.create({
      id: randomUUID(),
      code,
      pewarisId,
      expiresAt,
    });

    return {
      id: invitation.id,
      code: invitation.code,
      pewarisId: invitation.pewarisId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      usedByAhliWarisId: invitation.usedByAhliWarisId,
      createdAt: invitation.createdAt,
    };
  }
}
