// src/users/applications/dto/update-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsEmail,
} from 'class-validator';
import { PhoneNumberUtil } from '../../../../shared/utils/phone-number.util';

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
    description: 'Email pengguna (opsional).',
    example: 'budi@example.com',
  })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Nomor HP pengguna (opsional). Diterima format 08xx/62xx/+62xx, ' +
      'otomatis dinormalisasi ke format kanonik +62.',
    example: '081234567890',
  })
  @Transform(({ value }: { value: unknown }): string | undefined => {
    if (typeof value !== 'string') return undefined;
    return PhoneNumberUtil.normalize(value) ?? value.trim();
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+628\d{8,11}$/, {
    message:
      'Format nomor HP tidak valid. Gunakan nomor Indonesia yang benar, ' +
      'contoh: 081234567890 atau +6281234567890.',
  })
  phone?: string;

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
