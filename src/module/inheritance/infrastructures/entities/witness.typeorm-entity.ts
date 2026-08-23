import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WitnessStatus } from '../../domains/enums/witness.enum';

@Entity({ name: 'witnesses' })
export class WitnessTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  pewarisId: string = '';

  @Column({ type: 'varchar', length: 255 })
  name: string = '';

  @Column({ type: 'varchar', length: 255 })
  email: string = '';

  @Column({ type: 'varchar', length: 50 })
  phone: string = '';

  @Column({
    type: 'enum',
    enum: WitnessStatus,
    default: WitnessStatus.PENDING,
  })
  status: WitnessStatus = WitnessStatus.PENDING;

  @Index()
  @Column({ type: 'varchar', length: 512, nullable: true })
  magicLinkToken: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();
}
