// src/auth/applications/dto/auth-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID user',
    format: 'uuid',
  })
  id: string = '';

  @ApiProperty({ example: 'user@example.com', description: 'Email terdaftar' })
  email: string = '';

  @ApiPropertyOptional({
    example: 'Budi Santoso',
    nullable: true,
    description: 'Nama lengkap user, null jika belum diisi',
  })
  fullName: string | null = null;

  @ApiProperty({
    example: 'user',
    description: 'Peran user dalam sistem',
  })
  role: string = '';
}

/**
 * Bentuk respons SEBENARNYA dari endpoint yang membuat sesi
 * (login, verify-email, magic-link/verify).
 *
 * JWT TIDAK dikirim di body — token diset sebagai cookie `accessToken`
 * yang HttpOnly, sehingga tidak dapat dibaca JavaScript (mitigasi XSS).
 * Klien cukup mengirim cookie tersebut pada request berikutnya.
 */
export class AuthSessionResponseDto {
  @ApiProperty({ example: 'Login berhasil' })
  message: string = '';

  @ApiProperty({
    type: AuthUserDto,
    description: 'Data user yang sesinya baru dibuat',
  })
  user: AuthUserDto = new AuthUserDto();

  @ApiPropertyOptional({
    description:
      'Token JWT (tersedia untuk fallback jika HttpOnly cookie terblokir oleh policy cross-domain browser)',
  })
  accessToken?: string;
}

/**
 * Bentuk internal hasil autentikasi di layer aplikasi.
 *
 * CATATAN: DTO ini TIDAK dipakai sebagai bentuk respons HTTP. Controller
 * mengambil `accessToken` dari sini untuk diset sebagai cookie HttpOnly,
 * lalu mengembalikan `AuthSessionResponseDto` ke klien.
 */
export class AuthResponseDto {
  @ApiProperty({
    description:
      'JWT access token. Dipakai internal oleh controller untuk mengisi cookie HttpOnly — tidak pernah dikirim di body respons.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC4uLiJ9.signature',
  })
  accessToken: string = '';

  @ApiProperty({
    example: 'Bearer',
    description: 'Tipe token — selalu "Bearer"',
  })
  tokenType: string = 'Bearer';

  @ApiProperty({
    example: '7d',
    description: 'Durasi token valid (format: NNd / NNh / NNm)',
  })
  expiresIn: string = '';

  @ApiProperty({
    type: AuthUserDto,
    description: 'Data user yang berhasil login/register',
  })
  user: AuthUserDto = new AuthUserDto();
}
