import { InvitationStatus } from '../enums/invitation-status.enum';

export { InvitationStatus };

export class InvitationDomain {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly pewarisId: string,
    public readonly status: InvitationStatus,
    public readonly expiresAt: Date,
    public readonly relationshipType: string | null,
    public readonly relationshipDescription: string | null,
    public readonly supportingDocumentUrl: string | null,
    public readonly usedByAhliWarisId: string | null,
    public readonly createdAt: Date,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isUsable(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired();
  }
}
