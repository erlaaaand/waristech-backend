import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'death_verifications' })
export class DeathVerificationTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  pewarisId: string = '';

  @Column({ type: 'varchar', length: 1024 })
  documentUrl: string = '';

  @Column({ type: 'varchar', length: 36 })
  submittedByUserId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: true })
  verifiedByNotarisId: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();
}
