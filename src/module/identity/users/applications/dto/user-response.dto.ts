// src/users/applications/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID user',
    format: 'uuid',
  })
  id: string = '';

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email unik user',
  })
  email: string = '';

  @ApiPropertyOptional({
    example: 'Budi Santoso',
    nullable: true,
    description: 'Nama lengkap, null jika belum diisi',
  })
  fullName: string | null = null;

  @ApiPropertyOptional({
    example: 'https://storage.googleapis.com/...',
    nullable: true,
    description: 'URL foto profil',
  })
  avatarUrl: string | null = null;

  @ApiProperty({
    example: '081234567890',
    description: 'Nomor telepon',
  })
  phoneNumber: string = '';

  @ApiProperty({
    example: 'PARTICIPANT',
    description: 'Role user',
  })
  role: string = '';

  @ApiProperty({
    example: true,
    description: 'false jika akun telah dinonaktifkan (soft delete)',
  })
  isActive: boolean = false;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Waktu registrasi (ISO 8601)',
    format: 'date-time',
  })
  createdAt: Date = new Date();

  @ApiProperty({
    example: '2024-01-15T12:00:00.000Z',
    description: 'Waktu terakhir profil diupdate (ISO 8601)',
    format: 'date-time',
  })
  updatedAt: Date = new Date();
}
