// src/auth/applications/dto/register.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email unik untuk akun baru.',
    example: 'user@example.com',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\0/g, '').trim().toLowerCase();
  })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @MaxLength(255, { message: 'Email maksimal 255 karakter' })
  email: string = '';

  @ApiProperty({
    description:
      'Password minimal 8 karakter, harus mengandung huruf besar, huruf kecil, dan angka.',
    example: 'MySecret123',
    minLength: 8,
    maxLength: 128,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\0/g, '').trim();
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
  })
  password: string = '';

  @ApiPropertyOptional({
    description: 'Nama lengkap pengguna.',
    example: 'Budi Santoso',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }): string | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return undefined;
    return value
      .replace(/\0/g, '')
      .replace(/[<>'"]/g, '')
      .trim();
  })
  @IsString({ message: 'Nama harus berupa string' })
  @IsNotEmpty({ message: 'Nama wajib diisi untuk sertifikat' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  fullName: string = '';

  // ── Kontak Pengguna ──

  @ApiProperty({
    description: 'Nomor WhatsApp aktif peserta.',
    example: '081234567890',
    maxLength: 20,
  })
  @IsString({ message: 'Nomor telepon harus berupa teks' })
  @IsNotEmpty({ message: 'Nomor telepon wajib diisi' })
  @MaxLength(20)
  phoneNumber: string = '';
}
