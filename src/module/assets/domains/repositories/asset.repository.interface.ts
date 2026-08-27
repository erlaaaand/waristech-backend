import { AssetDomain } from '../entities/asset.entity';
import { AssetAllocationDomain } from '../entities/asset-allocation.entity';
import { AssetType, AssetStatus } from '../enums/asset.enum';

export const ASSET_REPOSITORY_TOKEN = Symbol('IAssetRepository');

export interface ICreateAssetData {
  id: string;
  pewarisId: string;
  type: AssetType;
  assetName: string;
  platform: string;
  accountIdentifier: string;
  encryptedSecret: string;
}

export interface IUpdateAssetData {
  type?: AssetType;
  assetName?: string;
  platform?: string;
  accountIdentifier?: string;
  encryptedSecret?: string;
  status?: AssetStatus;
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
  findByAhliWarisId(ahliWarisId: string): Promise<AssetDomain[]>;
  update(id: string, data: IUpdateAssetData): Promise<AssetDomain>;
  verify(id: string, notarisId: string): Promise<AssetDomain>;
  reject(id: string, notarisId: string): Promise<AssetDomain>;
  delete(id: string): Promise<void>;

  // Allocation
  upsertAllocation(data: IUpsertAllocationData): Promise<AssetAllocationDomain>;
  deleteAllocation(allocationId: string): Promise<void>;
  findAllocationsByAssetId(assetId: string): Promise<AssetAllocationDomain[]>;
  acknowledgeAllocation(allocationId: string): Promise<void>;

  // Scheduler & Background Tasks
  findStaleAssets(threshold: Date): Promise<AssetDomain[]>;
  findStaleLiquidations(threshold: Date): Promise<AssetDomain[]>;
}
