import {
  Inject,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../users/domains/repositories/user.repository.interface';
import { MailService } from '../../../../shared/mail/mail.service';
import { MessageResponseDto } from '../dto/message-response.dto';

@Injectable()
export class ResendOtpUseCase {
  private readonly logger = new Logger(ResendOtpUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(email: string): Promise<MessageResponseDto> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Email tidak terdaftar.');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email ini sudah terverifikasi.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    await this.userRepo.update(user.id, {
      otpCode,
      otpExpiresAt,
    });

    try {
      await this.mailService.sendOtpEmail(
        user.email,
        user.fullName || 'Peserta',
        otpCode,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Gagal mengirim ulang OTP ke ${user.email}.`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        message:
          'Kode OTP baru berhasil dibuat, namun pengiriman email gagal. Silakan coba lagi sesaat lagi.',
      };
    }

    return { message: 'OTP berhasil dikirim ulang. Silakan cek email Anda.' };
  }
}
