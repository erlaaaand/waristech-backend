import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  FamilyMemberStatus,
  RelationshipType,
} from '../../domains/enums/family-member.enum';

@Entity({ name: 'family_members' })
export class FamilyMemberTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  pewarisId: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  ahliWarisId: string = '';

  @Column({ type: 'enum', enum: RelationshipType })
  relationshipType: RelationshipType = RelationshipType.NASAB;

  @Column({ type: 'varchar', length: 255 })
  relationshipDescription: string = '';

  @Index()
  @Column({
    type: 'enum',
    enum: FamilyMemberStatus,
    default: FamilyMemberStatus.PENDING_CONFIRMATION,
  })
  status: FamilyMemberStatus = FamilyMemberStatus.PENDING_CONFIRMATION;

  @Column({ type: 'varchar', length: 512, nullable: true })
  supportingDocumentUrl: string | null = null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  verifiedByNotarisId: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();
}
