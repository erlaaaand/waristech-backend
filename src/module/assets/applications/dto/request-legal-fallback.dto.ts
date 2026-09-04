import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestLegalFallbackDto {
  @ApiProperty({
    example:
      'Perangkat Eksekutor hilang dan bagian kunci tidak tercadangkan; Notaris tidak dapat dihubungi.',
    description: 'Alasan mengapa jalur kunci digital tidak dapat ditempuh.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string = '';
}
