// src/auth/applications/use-cases/reset-password.use-case.ts
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../users/infrastructures/repositories/user.repository.interface';
import { UserDomainService } from '../../../users/domains/services/user-domain.service';
import { MessageResponseDto } from '../dto/message-response.dto';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly userDomainService: UserDomainService,
  ) {}

  async execute(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Kode OTP tidak valid atau kadaluarsa.');
    }
    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      throw new BadRequestException('Kode OTP tidak valid atau kadaluarsa.');
    }
    if (
      !user.resetPasswordOtpExpiresAt ||
      user.resetPasswordOtpExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Kode OTP sudah kadaluarsa. Silakan minta kode baru.',
      );
    }

    const hashedPassword =
      await this.userDomainService.hashPassword(newPassword);

    await this.userRepo.update(user.id, {
      password: hashedPassword,
      resetPasswordOtp: null,
      resetPasswordOtpExpiresAt: null,
    });

    return { message: 'Password berhasil direset. Silakan login kembali.' };
  }
}
