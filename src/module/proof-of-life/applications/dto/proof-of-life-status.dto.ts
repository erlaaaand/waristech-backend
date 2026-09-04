import { ApiProperty } from '@nestjs/swagger';
import { ProofOfLifeStage } from '../../domains/enums/proof-of-life-stage.enum';

export class ProofOfLifeStatusDto {
  @ApiProperty({
    description: 'Waktu check-in terakhir (default: waktu registrasi akun).',
  })
  lastCheckInAt: Date = new Date();

  @ApiProperty({ enum: ProofOfLifeStage })
  stage: ProofOfLifeStage = ProofOfLifeStage.ACTIVE;

  @ApiProperty({
    description:
      'Batas waktu check-in berikutnya (30 hari sejak check-in terakhir).',
  })
  nextCheckInDueAt: Date = new Date();

  @ApiProperty({
    description:
      'Sisa hari sebelum jatuh tempo. Negatif berarti sudah lewat jatuh tempo (dalam masa eskalasi).',
  })
  daysUntilDue: number = 0;
}
