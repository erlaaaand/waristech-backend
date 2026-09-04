import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import {
  FamilyMemberNotFoundException,
  NotAuthorizedForFamilyMemberException,
  NonNasabRequiresNotarisVerificationException,
} from '../../domains/exceptions/inheritance.exception';
import { FamilyMemberResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class ConfirmFamilyMemberUseCase {
  constructor(
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
  ) {}

  async execute(
    familyMemberId: string,
    pewarisId: string,
  ): Promise<FamilyMemberResponseDto> {
    const member = await this.familyMemberRepo.findById(familyMemberId);

    if (!member) {
      throw new FamilyMemberNotFoundException();
    }

    if (member.pewarisId !== pewarisId) {
      throw new NotAuthorizedForFamilyMemberException();
    }

    // Hubungan Non-Nasab WAJIB lewat verifikasi Notaris (dokumen pendukung
    // wajib diperiksa) — tidak boleh dikonfirmasi langsung oleh Pewaris,
    // walau relasinya masih berstatus PENDING_VERIFICATION saat ini.
    if (member.requiresDocumentVerification()) {
      throw new NonNasabRequiresNotarisVerificationException();
    }

    const updated =
      await this.familyMemberRepo.confirmByPewaris(familyMemberId);

    return {
      id: updated.id,
      pewarisId: updated.pewarisId,
      ahliWarisId: updated.ahliWarisId,
      relationshipType: updated.relationshipType,
      relationshipDescription: updated.relationshipDescription,
      status: updated.status,
      supportingDocumentUrl: updated.supportingDocumentUrl,
      verifiedByNotarisId: updated.verifiedByNotarisId,
      verifiedAt: updated.verifiedAt,
      createdAt: updated.createdAt,
    };
  }
}
