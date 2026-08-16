// src/auth/applications/dto/reset-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email akun yang ingin mereset password.',
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
    description: 'Kode OTP 6 digit yang dikirimkan ke email',
    example: '123456',
    maxLength: 6,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\0/g, '').trim();
  })
  @IsString({ message: 'Kode OTP harus berupa teks' })
  @IsNotEmpty({ message: 'Kode OTP tidak boleh kosong' })
  @MaxLength(6, { message: 'Kode OTP maksimal 6 karakter' })
  otp: string = '';

  @ApiProperty({
    description:
      'Password baru minimal 8 karakter, harus mengandung huruf besar, huruf kecil, dan angka.',
    example: 'MyNewSecret123',
    minLength: 8,
    maxLength: 128,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\0/g, '').trim();
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password baru wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
  })
  newPassword: string = '';
}
