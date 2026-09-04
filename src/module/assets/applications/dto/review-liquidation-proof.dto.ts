import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum LiquidationReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewLiquidationProofDto {
  @ApiProperty({
    enum: LiquidationReviewDecision,
    description:
      'APPROVE: bukti pencairan sah, aset lanjut ke DISTRIBUTED. ' +
      'REJECT: bukti tidak meyakinkan/mencurigakan, aset dieskalasi ke DISPUTED_LIQUIDATION.',
  })
  @IsEnum(LiquidationReviewDecision)
  @IsNotEmpty()
  decision!: LiquidationReviewDecision;

  @ApiPropertyOptional({
    example:
      'Nominal pada e-statement tidak sesuai dengan porsi yang dialokasikan.',
    description:
      'Wajib diisi bila decision = REJECT — jadi dasar Ahli Waris memahami alasan sengketa dan tercatat di audit trail.',
  })
  @ValidateIf(
    (o: ReviewLiquidationProofDto) =>
      o.decision === LiquidationReviewDecision.REJECT,
  )
  @IsString()
  @IsNotEmpty({ message: 'notes wajib diisi ketika decision = REJECT.' })
  @MaxLength(2000)
  notes?: string;
}
