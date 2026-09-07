import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  AssetType,
  AssetStatus,
  AssetCustodyType,
} from '../../domains/enums/asset.enum';
import { CalculationMethod } from '../../../calculation/domains/enums/calculation.enum';
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

  @Column({ type: 'varchar', length: 512, default: '' })
  encryptedSecret: string = '';

  @Column({
    type: 'enum',
    enum: AssetCustodyType,
    default: AssetCustodyType.VAULT,
  })
  custodyType: AssetCustodyType = AssetCustodyType.VAULT;

  @Index()
  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.PENDING_VERIFICATION,
  })
  status: AssetStatus = AssetStatus.PENDING_VERIFICATION;

  @Column({ type: 'varchar', length: 36, nullable: true })
  assignedNotarisId: string | null = null;

  /**
   * Skema hukum waris yang dipilih Pewaris untuk aset INI (bukan preferensi
   * global lama) -- label mengikat, ikut aturan lock yang sama dengan
   * alokasi: hanya bisa diubah selama status masih PENDING_VERIFICATION,
   * otomatis terkunci begitu Notaris memverifikasi aset.
   */
  @Column({
    type: 'enum',
    enum: CalculationMethod,
    nullable: true,
  })
  inheritanceScheme: CalculationMethod | null = null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  verifiedByNotarisId: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null = null;

  @Column({ type: 'timestamp', nullable: true })
  cooldownEndsAt: Date | null = null;

  /**
   * Kapan bagian kunci terakhir dipecah/dirotasi. Dipakai cron pengingat rotasi.
   * Tidak bisa memakai `updatedAt` karena rotasi hanya menyentuh tabel
   * asset_key_shares, bukan baris aset ini.
   */
  @Column({ type: 'timestamp', nullable: true })
  keysRotatedAt: Date | null = null;

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
