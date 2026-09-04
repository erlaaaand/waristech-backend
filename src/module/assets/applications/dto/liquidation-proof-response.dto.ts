import { ApiProperty } from '@nestjs/swagger';
import { LiquidationProofStatus } from '../../domains/enums/liquidation-proof.enum';

export class LiquidationProofResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() assetId!: string;
  @ApiProperty() assetName!: string;
  @ApiProperty() executorId!: string;
  @ApiProperty() pdfFileUrl!: string;
  @ApiProperty({
    nullable: true,
    description:
      'Kata sandi PDF (jika terkunci bank) — diserahkan ke Notaris agar dapat membuka dokumen untuk ditinjau.',
  })
  pdfPassword!: string | null;
  @ApiProperty({ enum: LiquidationProofStatus })
  status!: LiquidationProofStatus;
  @ApiProperty({ nullable: true }) validationNotes!: string | null;
  @ApiProperty() createdAt!: Date;
}
