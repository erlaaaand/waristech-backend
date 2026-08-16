// src/auth/interface/dto/verification-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AuthResponseDto } from '../../applications/dto/auth-response.dto';

export class VerificationResponseDto extends AuthResponseDto {
  @ApiProperty({ example: 'Email berhasil diverifikasi' })
  message: string = 'Email berhasil diverifikasi';
}
