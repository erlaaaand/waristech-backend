import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssetType, AssetStatus } from '../../domains/enums/asset.enum';
import { AssetAllocationTypeOrmEntity } from './asset-allocation.typeorm-entity';

@Entity({ name: 'assets' })
export class AssetTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  pewarisId: string = '';

  @Column({ type: 'enum', enum: AssetType })
  type: AssetType = AssetType.CRYPTO;

  @Column({ type: 'varchar', length: 255 })
  assetName: string = '';

  @Column({ type: 'varchar', length: 255 })
  platform: string = '';

  @Column({ type: 'varchar', length: 255 })
  accountIdentifier: string = '';

  @Column({ type: 'varchar', length: 512 })
  encryptedSecret: string = '';

  @Index()
  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.PENDING_VERIFICATION,
  })
  status: AssetStatus = AssetStatus.PENDING_VERIFICATION;

  @Column({ type: 'varchar', length: 36, nullable: true })
  verifiedByNotarisId: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null = null;

  @OneToMany(
    () => AssetAllocationTypeOrmEntity,
    (allocation) => allocation.asset,
    {
      cascade: true,
    },
  )
  allocations!: AssetAllocationTypeOrmEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();
}
