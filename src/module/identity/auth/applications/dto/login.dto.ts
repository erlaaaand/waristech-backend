// src/auth/applications/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email terdaftar pengguna.',
    example: 'user@example.com',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';

    return value.replaceAll('\0', '').trim().toLowerCase();
  })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @MaxLength(255, { message: 'Email maksimal 255 karakter' })
  email: string = '';

  @ApiProperty({
    description: 'Password akun (case-sensitive).',
    example: 'MySecret123',
    minLength: 8,
    maxLength: 128,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';

    return value.replaceAll('\0', '').trim();
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  password: string = '';
}
