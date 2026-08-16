// src/auth/applications/use-cases/forgot-password.use-case.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../users/infrastructures/repositories/user.repository.interface';
import { MailService } from '../../../../shared/mail/mail.service';
import { MessageResponseDto } from '../dto/message-response.dto';

const GENERIC_MESSAGE =
  'Jika email terdaftar, kode OTP reset password telah dikirimkan.';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(email: string): Promise<MessageResponseDto> {
    const user = await this.userRepo.findByEmail(email);

    // Jangan bocorkan apakah email terdaftar atau tidak (mencegah user enumeration).
    if (!user) {
      this.logger.warn(
        `Permintaan reset password untuk email yang tidak terdaftar: ${email}`,
      );
      return { message: GENERIC_MESSAGE };
    }

    // Generate 6 digit OTP & set kedaluwarsa 10 menit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    await this.userRepo.update(user.id, {
      resetPasswordOtp: otp,
      resetPasswordOtpExpiresAt: otpExpiresAt,
    });

    await this.mailService.sendResetPasswordEmail(
      user.email,
      user.fullName || 'Peserta',
      otp,
    );

    return { message: GENERIC_MESSAGE };
  }
}
