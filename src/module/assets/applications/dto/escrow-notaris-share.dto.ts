import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class EscrowNotarisShareDto {
  @ApiProperty({
    description: 'UUID Notaris yang public key-nya dipakai untuk mengenkripsi.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  @IsNotEmpty()
  notarisId: string = '';

  @ApiProperty({
    description:
      'Bagian kunci Notaris yang SUDAH dienkripsi di sisi klien dengan public key Notaris ' +
      '(base64). Server hanya menitipkan nilai ini dan tidak dapat membukanya.',
    example: 'kJ8f2...base64-ciphertext...==',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  encryptedShare: string = '';
}
