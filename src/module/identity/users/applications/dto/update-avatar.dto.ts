// src/users/applications/dto/update-avatar.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({
    description:
      'URL foto profil hasil upload dari POST /storage/upload ' +
      '(gunakan purpose: PROFILE_PHOTO). Unggah file dulu ke endpoint ' +
      'tersebut, lalu kirim `fileUrl` dari responsenya ke sini.',
    example: 'http://localhost:3000/uploads/profile-photos/uuid/abc123.jpg',
  })
  @Transform(({ value }: { value: unknown }): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
  })
  @IsUrl(
    { require_tld: false },
    { message: 'avatarUrl harus berupa URL yang valid' },
  )
  @IsNotEmpty({ message: 'avatarUrl wajib diisi' })
  avatarUrl: string = '';
}
