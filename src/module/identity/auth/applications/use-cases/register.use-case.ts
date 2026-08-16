// src/auth/applications/use-cases/register.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { CreateUserUseCase } from '../../../users/applications/use-cases/create-user.use-case';
import { CreateUserDto } from '../../../users/applications/dto/create-user.dto';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../../users/infrastructures/repositories/user.repository.interface';
import { MailService } from '../../../../shared/mail/mail.service';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly mailService: MailService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    dto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    // 1. Generate 6 digit OTP & set kedaluwarsa 10 menit
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    // 2. Mapping data langsung dengan status OTP (1 single INSERT query)
    const createDto: CreateUserDto = {
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      otpCode,
      otpExpiresAt,
      isEmailVerified: false,
      isActive: false,
    };

    // 3. Insert user ke database
    const user = await this.createUserUseCase.executeAndReturnEntity(createDto);

    // 4. Kirim OTP via Email
    await this.mailService.sendOtpEmail(
      user.email,
      user.fullName ?? 'Pelanggan',
      otpCode,
    );

    // 5. Kembalikan response sukses tanpa mengekspos JWT
    return {
      message:
        'Registrasi berhasil. Silakan cek email Anda untuk kode verifikasi.',
      userId: user.id,
    };
  }
}
