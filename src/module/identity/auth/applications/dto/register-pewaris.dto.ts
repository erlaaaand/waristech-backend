import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { RegisterDto } from './register.dto';

export class RegisterPewarisDto extends RegisterDto {
  @ApiProperty({
    description: 'Nomor Induk Kependudukan (NIK) 16 digit.',
    example: '3171012345670001',
    minLength: 16,
    maxLength: 16,
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\0/g, '').trim();
  })
  @IsString({ message: 'NIK harus berupa string angka' })
  @IsNotEmpty({ message: 'NIK wajib diisi untuk registrasi Pewaris' })
  @Length(16, 16, { message: 'NIK harus persis 16 digit' })
  @Matches(/^\d{16}$/, { message: 'NIK harus berupa 16 digit angka' })
  nik: string = '';
}
