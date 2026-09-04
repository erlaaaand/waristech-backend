import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RotateKeySharesDto {
  @ApiProperty({
    description:
      'Bagian kunci SYSTEM hasil pemecahan ULANG yang dilakukan di sisi klien. ' +
      'Klien merekonstruksi kredensial dari bagian yang ia pegang, memecahnya kembali ' +
      'menjadi 3 bagian baru, lalu mengirim bagian SYSTEM-nya ke sini.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  newSystemShare: string = '';

  @ApiPropertyOptional({
    description:
      'Bagian kunci Notaris yang baru, SUDAH dienkripsi di sisi klien dengan public key Notaris. ' +
      'Bila diisi, titipan lama akan digantikan.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(8192)
  newNotarisEncryptedShare?: string;
}
