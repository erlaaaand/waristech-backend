import { CalculationMethod } from '../enums/calculation.enum';

export { CalculationMethod };

export class ShareDetailDomain {
  constructor(
    public readonly ahliWarisId: string,
    public readonly relationshipDescription: string,
    public readonly ratio: string, // Contoh: "1/4", "1/8", "Musyawarah"
    public readonly calculatedPercentage: number, // Nilai persentase (unit 1-100)
  ) {}
}

export class DistributionDomain {
  constructor(
    public readonly id: string,
    public readonly pewarisId: string,
    public readonly method: CalculationMethod,
    public readonly baseUnit: number,
    public readonly shares: ShareDetailDomain[],
    public readonly createdAt: Date,
  ) {}
}
