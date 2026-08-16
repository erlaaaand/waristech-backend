// src/auth/applications/dto/verify-email.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email pengguna yang didaftarkan',
    example: 'user@example.com',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\0/g, '').trim().toLowerCase();
  })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
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
}
