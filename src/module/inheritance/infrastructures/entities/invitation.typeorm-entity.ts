import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { InvitationStatus } from '../../domains/enums/invitation-status.enum';

@Entity({ name: 'invitations' })
export class InvitationTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Column({ type: 'varchar', length: 30, unique: true })
  code: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  pewarisId: string = '';

  @Index()
  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus = InvitationStatus.PENDING;

  @Column({ type: 'timestamp' })
  expiresAt: Date = new Date();

  @Column({ type: 'varchar', length: 50, nullable: true })
  relationshipType: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  relationshipDescription: string | null = null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  supportingDocumentUrl: string | null = null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  usedByAhliWarisId: string | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();
}
