import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LiquidationProofStatus } from '../../domains/enums/liquidation-proof.enum';
import { AssetTypeOrmEntity } from './asset.typeorm-entity';

@Entity({ name: 'liquidation_proofs' })
export class LiquidationProofTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  assetId: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  executorId: string = '';

  @Column({ type: 'varchar', length: 1024 })
  pdfFileUrl: string = '';

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfPassword: string | null = null;

  @Column({ type: 'boolean', default: false })
  sptjmAgreed: boolean = false;

  @Column({
    type: 'enum',
    enum: LiquidationProofStatus,
    default: LiquidationProofStatus.PENDING_VALIDATION,
  })
  status: LiquidationProofStatus = LiquidationProofStatus.PENDING_VALIDATION;

  @Column({ type: 'text', nullable: true })
  validationNotes: string | null = null;

  @ManyToOne(() => AssetTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset!: AssetTypeOrmEntity;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();
}
