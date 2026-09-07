import { Inject, Injectable } from '@nestjs/common';
import {
  INVITATION_REPOSITORY_TOKEN,
  type IInvitationRepository,
} from '../../domains/repositories/invitation.repository.interface';
import {
  InvitationExpiredException,
  InvitationAlreadyUsedException,
  InvitationNotFoundException,
} from '../../domains/exceptions/inheritance.exception';
import { InvitationStatus } from '../../domains/entities/invitation.entity';

@Injectable()
export class ValidateInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
  ) {}

  /**
   * Memvalidasi kode undangan secara penuh (real database check).
   * Dipanggil oleh RegisterAhliWarisUseCase saat registrasi.
   * @returns pewarisId pemilik kode undangan tersebut
   */
  async execute(
    code: string,
  ): Promise<{ pewarisId: string; invitationId: string }> {
    const invitation = await this.invitationRepo.findByCode(code);

    if (!invitation) {
      throw new InvitationNotFoundException();
    }

    if (invitation.status === InvitationStatus.USED) {
      throw new InvitationAlreadyUsedException();
    }

    if (
      invitation.isExpired() ||
      invitation.status === InvitationStatus.EXPIRED
    ) {
      throw new InvitationExpiredException();
    }

    return {
      pewarisId: invitation.pewarisId,
      invitationId: invitation.id,
      relationshipType: invitation.relationshipType!,
      relationshipDescription: invitation.relationshipDescription!,
      supportingDocumentUrl: invitation.supportingDocumentUrl,
    };
  }
}
