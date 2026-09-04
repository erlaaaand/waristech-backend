import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ReportDataBreachDto {
  @ApiProperty({
    example: 'Akses tidak sah terdeteksi pada tabel asset_key_shares',
    description: 'Ringkasan singkat insiden kegagalan pelindungan data.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  summary: string = '';

  @ApiProperty({
    example:
      'Log menunjukkan 3 percobaan query langsung ke database di luar jam operasional dari IP tidak dikenal.',
    description: 'Uraian rinci insiden, termasuk waktu dan cara terdeteksi.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string = '';

  @ApiPropertyOptional({
    type: [String],
    description:
      'Daftar UUID pengguna yang datanya terdampak. Kosongkan bila belum teridentifikasi.',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  affectedUserIds?: string[];
}
