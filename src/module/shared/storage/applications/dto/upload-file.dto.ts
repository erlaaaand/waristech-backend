// src/shared/storage/applications/dto/upload-file.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { FilePurpose } from '../../domains/entities/stored-file.entity';

export type StorageProvider = 'local' | 's3' | 'cloudinary';

export class UploadFileDto {
  @ApiPropertyOptional({
    description: 'Tujuan/kategori file yang diunggah.',
    enum: FilePurpose,
    example: FilePurpose.OTHER,
  })
  @IsEnum(FilePurpose)
  @IsOptional()
  purpose?: FilePurpose;

  @ApiPropertyOptional({
    description:
      'Sub-folder penyimpanan. Hanya boleh berisi huruf, angka, strip, dan underscore.',
    example: 'predictions',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Context hanya boleh berisi huruf, angka, strip (-), dan underscore (_)',
  })
  context?: string;

  @ApiPropertyOptional({
    description: 'Storage provider yang digunakan.',
    enum: ['local', 's3', 'cloudinary'],
    example: 'local',
  })
  @IsIn(['local', 's3', 'cloudinary'])
  @IsOptional()
  provider?: StorageProvider;

  // Added to bypass validation pipe complaining about "property file should not exist"
  // when using Multer.
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  file?: unknown;
}
