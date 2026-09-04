import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { GenerateMagicLinkDto } from '../dto/generate-magic-link.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { IWitnessRepository } from '../../../../inheritance/domains/repositories/witness.repository.interface';
import { OtpService } from '../../domains/services/otp.service';
import { MailService } from '../../../../shared/mail/mail.service';
import {
  SMS_SENDER_TOKEN,
  type ISmsSender,
} from '../../../../shared/notifications/sms/sms-sender.interface';

const MAGIC_LINK_VALID_HOURS = 24;
const OTP_VALID_MINUTES = 15;

@Injectable()
export class GenerateMagicLinkUseCase {
  private readonly logger = new Logger(GenerateMagicLinkUseCase.name);

  constructor(
    private readonly witnessRepo: IWitnessRepository,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    @Inject(SMS_SENDER_TOKEN)
    private readonly smsSender: ISmsSender,
  ) {}

  async execute(dto: GenerateMagicLinkDto): Promise<MessageResponseDto> {
    const witness = await this.witnessRepo.findById(dto.entityId);
    if (!witness) {
      throw new NotFoundException('Witness not found');
    }

    if (witness.email !== dto.email) {
      throw new NotFoundException('Data Saksi atau email tidak sesuai');
    }

    // Token akses sekali pakai + OTP terpisah sebagai faktor kedua.
    const token = randomBytes(32).toString('hex');
    const otpCode = this.otpService.generateOtpCode();

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + MAGIC_LINK_VALID_HOURS);

    witness.magicLinkToken = token;
    witness.tokenExpiresAt = tokenExpiresAt;
    witness.otpCode = otpCode;
    witness.otpExpiresAt =
      this.otpService.calculateExpiration(OTP_VALID_MINUTES);

    await this.witnessRepo.save(witness);

    // Token & OTP SUDAH tersimpan di titik ini. Kegagalan pengiriman
    // email/SMS tidak dilempar sebagai 500 — Saksi tetap bisa diminta
    // mencoba lagi tanpa akun/data-nya rusak.
    let delivered = true;
    try {
      await this.mailService.sendWitnessMagicLink(
        witness.email,
        witness.name,
        token,
        otpCode,
      );

      if (witness.phone) {
        await this.smsSender.send(
          witness.phone,
          `[WarisTech] Kode verifikasi Saksi Anda: ${otpCode} (berlaku ${OTP_VALID_MINUTES} menit). Tautan verifikasi telah dikirim ke email Anda.`,
        );
      }
    } catch (error: unknown) {
      delivered = false;
      this.logger.error(
        `Gagal mengirim tautan magic link ke Saksi ${witness.email}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      message: delivered
        ? 'Tautan verifikasi dan kode OTP telah dikirim ke email Saksi terdaftar.'
        : 'Tautan verifikasi dibuat, namun pengiriman notifikasi gagal. Silakan minta tautan baru sesaat lagi.',
    };
  }
}
