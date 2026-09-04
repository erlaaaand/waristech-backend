import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { AssetTypeOrmEntity } from './asset.typeorm-entity';

// Satu ahli waris hanya boleh punya SATU baris alokasi per aset — memastikan
// alokasi ulang (koreksi persentase/eksekutor) mengoreksi baris yang ada,
// bukan menumpuk baris duplikat, dan menjadi jaring pengaman terakhir
// terhadap race condition di level aplikasi.
@Unique(['assetId', 'ahliWarisId'])
@Entity({ name: 'asset_allocations' })
export class AssetAllocationTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  assetId: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  ahliWarisId: string = '';

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number = 0;

  @Column({ type: 'boolean', default: false })
  isExecutor: boolean = false;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null = null;

  @ManyToOne(() => AssetTypeOrmEntity, (asset) => asset.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assetId' })
  asset!: AssetTypeOrmEntity;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();
}
