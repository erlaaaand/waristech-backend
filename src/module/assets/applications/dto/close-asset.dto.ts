import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseAssetDto {
  @ApiPropertyOptional({
    example:
      'Ahli waris tidak dapat dihubungi selama 45 hari, ditutup atas permintaan Pewaris lain yang sudah terverifikasi Notaris.',
    description:
      'Wajib diisi HANYA jika masih ada ahli waris yang belum acknowledge — menutup kasus secara paksa (force-close) dan dicatat di audit trail.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
