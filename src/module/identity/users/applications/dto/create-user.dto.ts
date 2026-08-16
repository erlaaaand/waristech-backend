// src/users/applications/dto/create-user.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @MaxLength(255)
  email: string = '';

  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
  })
  password: string = '';

  @IsString()
  @IsOptional() // Bisa dibuat opsional di level ini, tapi dikontrol ketat di RegisterDto
  @MaxLength(100)
  fullName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor telepon wajib diisi' })
  @MaxLength(20)
  phoneNumber: string = '';

  @IsOptional()
  otpCode?: string;

  @IsOptional()
  otpExpiresAt?: Date;

  @IsOptional()
  isEmailVerified?: boolean;

  @IsOptional()
  isActive?: boolean;
}
