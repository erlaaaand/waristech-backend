import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { RegisterDto } from './register.dto';

export class RegisterAhliWarisDto extends RegisterDto {
  @ApiProperty({
    description: 'Kode undangan resmi yang diberikan oleh Pewaris.',
    example: 'INV-WARIS-2026-X89A',
    maxLength: 50,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\0/g, '').trim().toUpperCase();
  })
  @IsString({ message: 'Kode undangan harus berupa string' })
  @IsNotEmpty({
    message:
      'Kode undangan (invitationCode) wajib diisi untuk registrasi Ahli Waris',
  })
  @MaxLength(50, { message: 'Kode undangan maksimal 50 karakter' })
  invitationCode: string = '';
}
