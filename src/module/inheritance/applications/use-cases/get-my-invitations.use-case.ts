import { Inject, Injectable } from '@nestjs/common';
import {
  INVITATION_REPOSITORY_TOKEN,
  type IInvitationRepository,
} from '../../domains/repositories/invitation.repository.interface';
import { InvitationResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class GetMyInvitationsUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
  ) {}

  async execute(pewarisId: string): Promise<InvitationResponseDto[]> {
    const invitations = await this.invitationRepo.findByPewarisId(pewarisId);

    return invitations.map((inv) => ({
      id: inv.id,
      code: inv.code,
      pewarisId: inv.pewarisId,
      status: inv.status,
      expiresAt: inv.expiresAt,
      usedByAhliWarisId: inv.usedByAhliWarisId,
      createdAt: inv.createdAt,
    }));
  }
}
