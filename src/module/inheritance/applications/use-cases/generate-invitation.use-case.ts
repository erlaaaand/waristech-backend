import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { buildInvitationLink } from '../services/invitation-link.util';
import { MissingSupportingDocumentException } from '../../domains/exceptions/inheritance.exception';
import { isDuplicateKeyError } from '../../../shared/utils/database-error.util';
import { InvitationDomain } from '../../domains/entities/invitation.entity';

const MAX_CODE_COLLISION_RETRIES = 3;

@Injectable()
export class GenerateInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    private readonly invitationCodeService: InvitationCodeService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    pewarisId: string,
    dto: GenerateInvitationDto,
  ): Promise<InvitationResponseDto> {
    // 1. Validasi: jika NON_NASAB wajib ada dokumen pendukung.
    // Sudah divalidasi di DTO (ValidateIf); pengecekan ini adalah jaring
    // pengaman kedua bila use case ini dipanggil di luar jalur HTTP/DTO.
    if (
      dto.relationshipType === RelationshipType.NON_NASAB &&
      !dto.supportingDocumentUrl
    ) {
      throw new MissingSupportingDocumentException();
    }

    // 2. Buat kode undangan unik & set kedaluwarsa 7 hari, dengan retry bila
    // (sangat jarang) terjadi tabrakan kode dengan undangan lain yang sudah ada.
    const expiresAt = this.invitationCodeService.calculateExpiration(7);
    const invitation = await this.createWithRetry(pewarisId, expiresAt, dto);

    return {
      id: invitation.id,
      code: invitation.code,
      invitationLink: buildInvitationLink(this.configService, invitation.code),
      pewarisId: invitation.pewarisId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      usedByAhliWarisId: invitation.usedByAhliWarisId,
      createdAt: invitation.createdAt,
    };
  }

  private async createWithRetry(
    pewarisId: string,
    expiresAt: Date,
    dto: GenerateInvitationDto,
  ): Promise<InvitationDomain> {
    for (let attempt = 1; attempt <= MAX_CODE_COLLISION_RETRIES; attempt++) {
      const code = this.invitationCodeService.generateCode();
      try {
        return await this.invitationRepo.create({
          id: randomUUID(),
          code,
          pewarisId,
          expiresAt,
          relationshipType: dto.relationshipType,
          relationshipDescription: dto.relationshipDescription,
          supportingDocumentUrl: dto.supportingDocumentUrl,
        });
      } catch (error: unknown) {
        if (
          !isDuplicateKeyError(error) ||
          attempt === MAX_CODE_COLLISION_RETRIES
        ) {
          throw error;
        }
        // Tabrakan kode (sangat jarang) — coba lagi dengan kode baru.
      }
    }
    // Tidak pernah tercapai (loop selalu return atau throw), hanya agar TypeScript puas.
    throw new Error('Gagal membuat kode undangan setelah beberapa percobaan.');
  }
}
