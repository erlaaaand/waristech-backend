import { InvitationDomain } from '../entities/invitation.entity';

export const INVITATION_REPOSITORY_TOKEN = Symbol(
  'INVITATION_REPOSITORY_TOKEN',
);

export interface IInvitationRepository {
  create(data: {
    id: string;
    code: string;
    pewarisId: string;
    expiresAt: Date;
  }): Promise<InvitationDomain>;

  findByCode(code: string): Promise<InvitationDomain | null>;

  findByPewarisId(pewarisId: string): Promise<InvitationDomain[]>;

  markAsUsed(code: string, ahliWarisId: string): Promise<InvitationDomain>;

  markExpiredByPewarisId(pewarisId: string): Promise<void>;
}
