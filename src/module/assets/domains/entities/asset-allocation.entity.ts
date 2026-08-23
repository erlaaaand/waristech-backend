export class AssetAllocationDomain {
  constructor(
    public readonly id: string,
    public readonly assetId: string,
    public readonly ahliWarisId: string,
    public readonly percentage: number, // 0 < percentage <= 100
    public readonly isExecutor: boolean, // Hanya 1 per aset, pemegang kunci pencairan
    public readonly acknowledgedAt: Date | null, // Timestamp konfirmasi penerimaan dana
    public readonly createdAt: Date,
  ) {}
}
