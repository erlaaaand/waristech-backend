import { AssetDomain } from '../entities/asset.entity';
import { AssetAllocationDomain } from '../entities/asset-allocation.entity';
import { AssetType, AssetStatus, AssetCustodyType } from '../enums/asset.enum';

export const ASSET_REPOSITORY_TOKEN = Symbol('IAssetRepository');

export interface ICreateAssetData {
  id: string;
  pewarisId: string;
  type: AssetType;
  assetName: string;
  platform: string;
  accountIdentifier: string;
  custodyType: AssetCustodyType;
  assignedNotarisId: string;
  /** @deprecated Kredensial baru disimpan via Secret Sharing (lihat IKeyShareRepository). */
  encryptedSecret?: string;
}

export interface IUpdateAssetData {
  type?: AssetType;
  assetName?: string;
  platform?: string;
  accountIdentifier?: string;
  assignedNotarisId?: string;
  encryptedSecret?: string;
  status?: AssetStatus;
  cooldownEndsAt?: Date | null;
  keysRotatedAt?: Date | null;
}

export interface IUpsertAllocationData {
  id: string;
  assetId: string;
  ahliWarisId: string;
  percentage: number;
  isExecutor: boolean;
}

export interface IAssetRepository {
  create(data: ICreateAssetData): Promise<AssetDomain>;
  findById(id: string): Promise<AssetDomain | null>;
  findByPewarisId(pewarisId: string): Promise<AssetDomain[]>;
  findByStatus(status: AssetStatus): Promise<AssetDomain[]>;
  findByStatuses(statuses: AssetStatus[]): Promise<AssetDomain[]>;
  findByAssignedNotarisIdAndStatuses(
    assignedNotarisId: string,
    statuses: AssetStatus[],
  ): Promise<AssetDomain[]>;
  findByAhliWarisId(ahliWarisId: string): Promise<AssetDomain[]>;
  update(id: string, data: IUpdateAssetData): Promise<AssetDomain>;
  verify(id: string, notarisId: string): Promise<AssetDomain>;
  reject(id: string, notarisId: string): Promise<AssetDomain>;
  delete(id: string): Promise<void>;
  /**
   * Tutup kasus & hancurkan `encryptedSecret` (data shredding) dalam SATU
   * UPDATE atomik bersyarat (hanya dari status DISTRIBUTED/DISPUTED_LIQUIDATION)
   * — mencegah penutupan ganda dan menghindari jendela waktu antara "wipe"
   * dan "null-kan" pada pendekatan dua langkah sebelumnya.
   */
  closeAndShred(id: string): Promise<AssetDomain>;

  // Allocation
  upsertAllocation(data: IUpsertAllocationData): Promise<AssetAllocationDomain>;
  /**
   * Sama seperti upsertAllocation, tapi seluruh baca-validasi-tulis dilakukan
   * atomik dalam satu transaksi dengan row lock — dipakai jalur produksi
   * (AllocateAssetUseCase) untuk menutup race condition alokasi bersamaan.
   */
  allocateAtomic(
    assetId: string,
    ahliWarisId: string,
    percentage: number,
    isExecutor: boolean,
  ): Promise<AssetAllocationDomain>;
  deleteAllocation(allocationId: string): Promise<void>;
  findAllocationsByAssetId(assetId: string): Promise<AssetAllocationDomain[]>;
  acknowledgeAllocation(allocationId: string): Promise<void>;

  // Scheduler & Background Tasks
  findStaleAssets(threshold: Date): Promise<AssetDomain[]>;
  findStaleLiquidations(threshold: Date): Promise<AssetDomain[]>;
  findExpiredCooldowns(now: Date): Promise<AssetDomain[]>;

  /** Aset lama yang masih pakai skema `encryptedSecret` tunggal (belum dimigrasi ke Secret Sharing). */
  findAllWithLegacySecret(): Promise<AssetDomain[]>;
}
