// src/modules/shared/mail/mail.service.ts

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Tambahkan || '' atau nilai default untuk mencegah undefined
    const host = this.configService.get<string>('EMAIL_HOST') || '';

    // Berikan '587' sebagai string cadangan sebelum di-parse
    const port = parseInt(
      this.configService.get<string>('EMAIL_PORT') || '587',
      10,
    );

    // Perbandingan === otomatis menghasilkan boolean murni
    const secure = this.configService.get<string>('EMAIL_SECURE') === 'true';

    const user = this.configService.get<string>('EMAIL_USER') || '';
    const pass = this.configService.get<string>('EMAIL_PASS') || '';

    this.logger.log(
      `SMTP Config -> host=${host}, port=${port}, secure=${secure}, user=${user}`,
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  onModuleInit(): void {
    // Jalankan verifikasi di background agar tidak memblokir startup (terutama di Hostinger)
    this.transporter
      .verify()
      .then(() => {
        this.logger.log('✅ SMTP connection berhasil.');
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          this.logger.error(`SMTP Verify Error: ${err.message}`, err.stack);
        } else {
          this.logger.error('SMTP Verify Error', String(err));
        }
      });
  }

  async sendOtpEmail(to: string, name: string, otp: string): Promise<void> {
    try {
      const sender = this.configService.get<string>('EMAIL_USER');
      const appName =
        this.configService.get<string>('EMAIL_FROM_NAME') ||
        'Hanifa Elektronik';

      await this.transporter.sendMail({
        from: `"${appName}" <${sender}>`,
        to,
        subject: `Kode Verifikasi Akun ${appName}`,
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Halo ${name}</h2>

            <p>Terima kasih telah mendaftar di ${appName}.</p>

            <p>Gunakan kode OTP berikut:</p>

            <h1 style="
              letter-spacing:8px;
              color:#2563eb;
            ">
              ${otp}
            </h1>

            <p>
              OTP berlaku selama <b>10 menit</b>.
            </p>

            <p>
              Jangan berikan kode ini kepada siapa pun.
            </p>
          </div>
        `,
      });

      this.logger.log(`OTP berhasil dikirim ke ${to}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(
          `Gagal mengirim email ke ${to}: ${err.message}`,
          err.stack,
        );
      }

      throw new InternalServerErrorException('Gagal mengirimkan email OTP.');
    }
  }

  async sendResetPasswordEmail(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    try {
      const sender = this.configService.get<string>('EMAIL_USER');
      const appName =
        this.configService.get<string>('EMAIL_FROM_NAME') ||
        'Hanifa Elektronik';

      await this.transporter.sendMail({
        from: `"${appName}" <${sender}>`,
        to,
        subject: `Kode Reset Password ${appName}`,
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Halo ${name}</h2>

            <p>Kami menerima permintaan untuk mereset password akun Anda.</p>

            <p>Gunakan kode OTP berikut untuk melanjutkan proses reset password:</p>

            <h1 style="
              letter-spacing:8px;
              color:#2563eb;
            ">
              ${otp}
            </h1>

            <p>
              Kode berlaku selama <b>10 menit</b>.
            </p>

            <p>
              Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini
              dan password Anda akan tetap aman.
            </p>
          </div>
        `,
      });

      this.logger.log(`Kode reset password berhasil dikirim ke ${to}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(
          `Gagal mengirim email reset password ke ${to}: ${err.message}`,
          err.stack,
        );
      }

      throw new InternalServerErrorException(
        'Gagal mengirimkan email reset password.',
      );
    }
  }
}
