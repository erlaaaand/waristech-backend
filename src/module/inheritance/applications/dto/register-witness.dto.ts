import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterWitnessDto {
  @ApiProperty({ example: 'Andi Wijaya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string = '';

  @ApiProperty({ example: 'andi.wijaya@gmail.com' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty()
  email: string = '';

  @ApiProperty({ example: '081234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone: string = '';
}
