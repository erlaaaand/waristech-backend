import { Inject, Injectable, ConflictException, Logger } from '@nestjs/common';
import { AdminCreateUserDto } from '../dto/admin-create-user.dto';
import { UserRole } from '../../domains/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../domains/repositories/user.repository.interface';
import { isDuplicateKeyError } from '../../../../shared/utils/database-error.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminCreateUserUseCase {
  private readonly logger = new Logger(AdminCreateUserUseCase.name);
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    dto: AdminCreateUserDto,
  ): Promise<{ message: string; userId: string }> {
    // 0. Validasi Role: Admin hanya boleh membuat NOTARIS atau ADMIN baru
    if (dto.role === UserRole.PEWARIS || dto.role === UserRole.AHLI_WARIS) {
      throw new ConflictException(
        'Admin tidak diperbolehkan membuat akun Pewaris atau Ahli Waris. Pewaris melakukan registrasi mandiri, Ahli Waris melalui undangan.',
      );
    }
    // 1. Cek apakah email sudah terdaftar
    const emailExists = await this.userRepo.existsByEmail(dto.email);
    if (emailExists) {
      throw new ConflictException('Email sudah terdaftar di sistem.');
    }

    // 2. Hash password yang diberikan admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    try {
      // Catatan UU PDP: `consentGivenAt` sengaja dibiarkan kosong. Persetujuan
      // pemrosesan data pribadi wajib diberikan oleh Subjek Data sendiri, tidak
      // boleh diwakilkan Admin — pengguna memberikannya via POST /compliance/consent.
      const savedUser = await this.userRepo.create({
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        role: dto.role,
        isEmailVerified: true,
        isActive: true,
      });
      return {
        message: 'Akun berhasil dibuat dan langsung terverifikasi.',
        userId: savedUser.id,
      };
    } catch (error: unknown) {
      // Jaring pengaman terhadap race condition pada cek email di atas.
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Email sudah terdaftar di sistem.');
      }

      this.logger.error(
        'Gagal membuat akun.',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
