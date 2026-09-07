import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PhoneNumberUtil } from '../../../shared/utils/phone-number.util';

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
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return PhoneNumberUtil.normalize(value) ?? value.trim();
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+628\d{8,11}$/, {
    message:
      'Format nomor HP tidak valid. Gunakan nomor Indonesia yang benar, ' +
      'contoh: 081234567890 atau +6281234567890.',
  })
  @MaxLength(50)
  phone: string = '';
}
