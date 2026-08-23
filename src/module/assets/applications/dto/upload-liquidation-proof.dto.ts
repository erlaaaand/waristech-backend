import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UploadLiquidationProofDto {
  @ApiProperty({
    example: 'https://storage.waristech.id/proofs/abc123.pdf',
    description: 'URL file PDF e-Statement resmi dari bank',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  pdfFileUrl!: string;

  @ApiProperty({
    example: '19850115',
    description: 'Kata sandi PDF (jika terkunci oleh bank)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  pdfPassword?: string;

  @ApiProperty({
    example: true,
    description:
      'Eksekutor menyetujui Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)',
  })
  @IsBoolean()
  @IsNotEmpty()
  sptjmAgreed!: boolean;
}
