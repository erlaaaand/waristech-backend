import {
  FamilyMemberDomain,
  FamilyMemberStatus,
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

  findByAhliWarisId(ahliWarisId: string): Promise<FamilyMemberDomain[]>;

  findById(id: string): Promise<FamilyMemberDomain | null>;

  /** (NOTARIS) Cari relasi keluarga berdasarkan status — dipakai untuk
   * menampilkan antrean Non-Nasab yang menunggu verifikasi. */
  findByStatus(status: FamilyMemberStatus): Promise<FamilyMemberDomain[]>;

  verify(id: string, notarisId: string): Promise<FamilyMemberDomain>;

  reject(id: string, notarisId: string): Promise<FamilyMemberDomain>;

  confirmByPewaris(id: string): Promise<FamilyMemberDomain>;
}
