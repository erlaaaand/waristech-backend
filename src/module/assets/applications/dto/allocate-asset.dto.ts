import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AllocateAssetDto {
  @ApiProperty({ example: 'uuid-ahli-waris' })
  @IsUUID()
  @IsNotEmpty()
  ahliWarisId!: string;

  @ApiProperty({ example: 50, description: 'Percentage allocation (1-100)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsNotEmpty()
  percentage!: number;

  @ApiProperty({
    example: false,
    description: 'Menunjuk Ahli Waris ini sebagai Eksekutor pencairan',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isExecutor?: boolean;

  @ApiPropertyOptional({
    example:
      'Pewaris memilih membagi lebih besar ke anak bungsu karena tanggungan biaya kuliah.',
    description:
      'Wajib diisi HANYA jika `percentage` menyimpang dari hasil hitungan skema hukum waris pilihan Pewaris (lihat GET /calculation/preference).',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
