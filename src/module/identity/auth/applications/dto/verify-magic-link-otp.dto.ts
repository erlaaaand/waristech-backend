import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMagicLinkOtpDto {
  @ApiProperty({
    description: 'Token magic link yang unik',
    example: 'a1b2c3d4e5...',
  })
  @IsNotEmpty()
  @IsString()
  token: string = '';

  @ApiProperty({ description: '6-digit OTP code', example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp: string = '';
}
