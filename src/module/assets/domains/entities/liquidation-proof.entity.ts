import { LiquidationProofStatus } from '../enums/liquidation-proof.enum';

export class LiquidationProofDomain {
  constructor(
    public readonly id: string,
    public readonly assetId: string,
    public readonly executorId: string,
    public readonly pdfFileUrl: string,
    public readonly pdfPassword: string | null,
    public readonly sptjmAgreed: boolean,
    public readonly status: LiquidationProofStatus,
    public readonly validationNotes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
