import {
  RelationshipType,
  FamilyMemberStatus,
} from '../enums/family-member.enum';

export { RelationshipType, FamilyMemberStatus };

export class FamilyMemberDomain {
  constructor(
    public readonly id: string,
    public readonly pewarisId: string,
    public readonly ahliWarisId: string,
    public readonly relationshipType: RelationshipType,
    public readonly relationshipDescription: string,
    public readonly status: FamilyMemberStatus,
    public readonly supportingDocumentUrl: string | null,
    public readonly verifiedByNotarisId: string | null,
    public readonly verifiedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  requiresDocumentVerification(): boolean {
    return this.relationshipType === RelationshipType.NON_NASAB;
  }

  isPendingVerification(): boolean {
    return this.status === FamilyMemberStatus.PENDING_VERIFICATION;
  }
}
