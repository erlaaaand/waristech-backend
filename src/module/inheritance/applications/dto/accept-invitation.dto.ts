import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description:
      'Kode undangan yang dibagikan Pewaris (sama seperti dipakai di ' +
      'POST /auth/register/ahli-waris, tapi di sini akun Ahli Waris SUDAH login).',
    example: 'ABC123XY',
  })
  @IsString()
  @IsNotEmpty({ message: 'Kode undangan wajib diisi' })
  @MaxLength(32)
  invitationCode: string = '';
}
