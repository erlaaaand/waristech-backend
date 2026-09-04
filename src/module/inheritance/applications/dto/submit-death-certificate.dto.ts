import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SubmitDeathCertificateDto {
  @ApiProperty({ example: 'uuid-pewaris' })
  @IsUUID()
  @IsNotEmpty()
  pewarisId: string = '';

  @ApiProperty({
    example: 'http://localhost:3000/uploads/death-certificates/uuid/abc.pdf',
    description:
      'URL dokumen akta kematian resmi dari Dukcapil, diunggah terlebih dahulu via POST /storage/upload (purpose: DEATH_CERTIFICATE).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  documentUrl: string = '';
}
