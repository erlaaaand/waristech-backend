import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPublicKeyDto {
  @ApiProperty({
    description:
      'Public key Notaris dalam format PEM (SPKI). Keypair WAJIB dibuat di sisi klien — ' +
      'private key tidak boleh dikirim ke server dalam kondisi apa pun.',
    example:
      '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(100, { message: 'Public key tidak valid (terlalu pendek).' })
  @MaxLength(4096)
  publicKey: string = '';
}
