import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectAssetDto {
  @ApiProperty({
    example:
      'Dokumen kepemilikan yang dilampirkan tidak sesuai dengan nama Pewaris.',
    description:
      'Alasan penolakan — wajib diisi, jadi dasar Pewaris memahami alasan ' +
      'penolakan dan tercatat di audit trail (konsisten dengan alur review ' +
      'bukti pencairan yang juga mewajibkan alasan saat REJECT).',
  })
  @IsString()
  @IsNotEmpty({ message: 'reason wajib diisi.' })
  @MaxLength(2000)
  reason: string = '';
}
