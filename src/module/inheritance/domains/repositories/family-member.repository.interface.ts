import {
  FamilyMemberDomain,
  RelationshipType,
} from '../entities/family-member.entity';

export const FAMILY_MEMBER_REPOSITORY_TOKEN = Symbol(
  'FAMILY_MEMBER_REPOSITORY_TOKEN',
);

export interface IFamilyMemberRepository {
  create(data: {
    id: string;
    pewarisId: string;
    ahliWarisId: string;
    relationshipType: RelationshipType;
    relationshipDescription: string;
    supportingDocumentUrl?: string | null;
  }): Promise<FamilyMemberDomain>;

  findByPewarisId(pewarisId: string): Promise<FamilyMemberDomain[]>;

  findById(id: string): Promise<FamilyMemberDomain | null>;

  verify(id: string, notarisId: string): Promise<FamilyMemberDomain>;

  reject(id: string, notarisId: string): Promise<FamilyMemberDomain>;

  confirmByPewaris(id: string): Promise<FamilyMemberDomain>;
}
