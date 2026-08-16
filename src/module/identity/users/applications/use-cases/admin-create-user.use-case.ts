import {
  Inject,
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AdminCreateUserDto } from '../dto/admin-create-user.dto';
import { UserEntity } from '../../domains/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/user.repository.interface';
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
    // 1. Cek apakah email sudah terdaftar
    const emailExists = await this.userRepo.existsByEmail(dto.email);
    if (emailExists) {
      throw new ConflictException('Email sudah terdaftar di sistem.');
    }

    // 2. Hash password yang diberikan admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 3. Buat entity User baru
    const newUser = new UserEntity();
    newUser.email = dto.email;
    newUser.password = hashedPassword;
    newUser.fullName = dto.fullName;
    newUser.role = dto.role;
    newUser.isEmailVerified = true;
    newUser.isActive = true;

    try {
      const savedUser = await this.userRepo.save(newUser);
      return {
        message: 'Akun berhasil dibuat dan langsung terverifikasi.',
        userId: savedUser.id,
      };
    } catch (error: unknown) {
      this.logger.error(
        'Gagal membuat akun.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Gagal membuat akun.');
    }
  }
}
