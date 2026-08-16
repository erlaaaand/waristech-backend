import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

// Asumsi kamu memiliki enum UserRole
export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
}

export class AdminCreateUserDto {
  @ApiProperty({ example: 'peserta@gmail.com' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty()
  email: string = '';

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @IsNotEmpty()
  password: string = '';

  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @IsNotEmpty()
  fullName: string = '';

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole = UserRole.CUSTOMER;
}
