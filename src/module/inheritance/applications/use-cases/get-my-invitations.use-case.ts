import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INVITATION_REPOSITORY_TOKEN,
  type IInvitationRepository,
} from '../../domains/repositories/invitation.repository.interface';
import { InvitationResponseDto } from '../dto/inheritance-response.dto';
import { buildInvitationLink } from '../services/invitation-link.util';

@Injectable()
export class GetMyInvitationsUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(pewarisId: string): Promise<InvitationResponseDto[]> {
    const invitations = await this.invitationRepo.findByPewarisId(pewarisId);

    return invitations.map((inv) => ({
      id: inv.id,
      code: inv.code,
      invitationLink: buildInvitationLink(this.configService, inv.code),
      pewarisId: inv.pewarisId,
      status: inv.status,
      expiresAt: inv.expiresAt,
      usedByAhliWarisId: inv.usedByAhliWarisId,
      createdAt: inv.createdAt,
    }));
  }
}
