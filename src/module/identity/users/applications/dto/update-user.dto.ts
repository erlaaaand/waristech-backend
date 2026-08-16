// src/users/applications/dto/update-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Nama lengkap pengguna (opsional).',
    example: 'Budi Santoso',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Password saat ini — wajib jika ingin mengganti password.',
    example: 'OldPass123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(128)
  currentPassword?: string;

  @ApiPropertyOptional({
    description:
      'Password baru — wajib jika ingin mengganti password. ' +
      'Minimal 8 karakter, harus mengandung huruf besar, huruf kecil, dan angka.',
    example: 'NewPass456',
    minLength: 8,
    maxLength: 128,
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password baru harus mengandung huruf besar, huruf kecil, dan angka',
  })
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  @MaxLength(128, { message: 'Password baru maksimal 128 karakter' })
  newPassword?: string;
}
