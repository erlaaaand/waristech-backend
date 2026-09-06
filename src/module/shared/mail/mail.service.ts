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
      const sender =
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
        this.configService.get<string>('EMAIL_USER');
      const appName =
        this.configService.get<string>('EMAIL_FROM_NAME') || 'WarisTech';

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
      const sender =
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
        this.configService.get<string>('EMAIL_USER');
      const appName =
        this.configService.get<string>('EMAIL_FROM_NAME') || 'WarisTech';

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

  /** Tahap Peringatan (hari 1-14 setelah checkpoint 30 hari terlewat). */
  async sendProofOfLifeReminder(to: string, name: string): Promise<void> {
    try {
      const sender =
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
        this.configService.get<string>('EMAIL_USER');
      const appName =
        this.configService.get<string>('EMAIL_FROM_NAME') || 'WarisTech';

      await this.transporter.sendMail({
        from: `"${appName}" <${sender}>`,
        to,
        subject: `[Penting] Konfirmasi Status Akun ${appName} Anda`,
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Halo ${name}</h2>

            <p>
              Sudah lebih dari 30 hari sejak konfirmasi aktif terakhir Anda di ${appName}.
            </p>

            <p>
              Mohon segera login dan lakukan konfirmasi status ("Check-in") untuk memastikan
              rencana warisan digital Anda tidak memasuki proses verifikasi kematian secara keliru.
            </p>

            <p>
              Jika tidak ada respons dalam <b>14 hari</b> ke depan, kami akan menghubungi
              kontak darurat yang Anda daftarkan.
            </p>
          </div>
        `,
      });

      this.logger.log(`Proof-of-Life reminder terkirim ke ${to}`);
    } catch (err: unknown) {
      this.logger.error(
        `Gagal mengirim Proof-of-Life reminder ke ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** Kirim magic link + OTP kepada Saksi untuk proses verifikasi kematian. */
  async sendWitnessMagicLink(
    to: string,
    witnessName: string,
    token: string,
    otp: string,
  ): Promise<void> {
    try {
      const sender =
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
        this.configService.get<string>('EMAIL_USER');
      const appName =
        this.configService.get<string>('EMAIL_FROM_NAME') || 'WarisTech';
      const baseUrl =
        this.configService.get<string>('APP_FRONTEND_URL') ||
        'http://localhost:3000';
      const link = `${baseUrl}/verifikasi/saksi?token=${token}`;

      await this.transporter.sendMail({
        from: `"${appName}" <${sender}>`,
        to,
        subject: `[${appName}] Permintaan Verifikasi sebagai Saksi`,
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Halo ${witnessName}</h2>

            <p>
              Anda diminta memberikan keputusan sebagai <b>Saksi</b> dalam proses
              verifikasi kematian di ${appName}.
            </p>

            <p>Buka tautan berikut untuk melanjutkan:</p>
            <p><a href="${link}">${link}</a></p>

            <p>Lalu masukkan kode OTP berikut:</p>
            <h1 style="letter-spacing:8px;color:#2563eb;">${otp}</h1>

            <p>
              Tautan berlaku <b>24 jam</b>, kode OTP berlaku <b>15 menit</b>.
            </p>

            <p>
              Bila Anda merasa tidak seharusnya menerima permintaan ini, abaikan
              email ini dan segera hubungi keluarga yang bersangkutan.
            </p>
          </div>
        `,
      });

      this.logger.log(`Magic link Saksi terkirim ke ${to}`);
    } catch (err: unknown) {
      this.logger.error(
        `Gagal mengirim magic link Saksi ke ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException(
        'Gagal mengirimkan tautan verifikasi Saksi.',
      );
    }
  }

  /** Tahap Kontak Darurat (hari 15-30 setelah checkpoint 30 hari terlewat). */
  async sendEmergencyContactAlert(
    to: string,
    contactName: string,
    pewarisName: string,
  ): Promise<void> {
    try {
      const sender =
        this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
        this.configService.get<string>('EMAIL_USER');
      const appName =
        this.configService.get<string>('EMAIL_FROM_NAME') || 'WarisTech';

      await this.transporter.sendMail({
        from: `"${appName}" <${sender}>`,
        to,
        subject: `[${appName}] Mohon Konfirmasi Status ${pewarisName}`,
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Halo ${contactName}</h2>

            <p>
              Anda terdaftar sebagai kontak darurat untuk <b>${pewarisName}</b> di ${appName}.
            </p>

            <p>
              Kami belum menerima konfirmasi status aktif dari ${pewarisName} selama lebih dari
              44 hari. Mohon bantu kami memastikan kabar beliau baik-baik saja.
            </p>

            <p>
              Jika tidak ada kabar dalam <b>15 hari</b> ke depan, sistem akan otomatis memulai
              proses verifikasi kematian berjenjang.
            </p>
          </div>
        `,
      });

      this.logger.log(`Emergency contact alert terkirim ke ${to}`);
    } catch (err: unknown) {
      this.logger.error(
        `Gagal mengirim emergency contact alert ke ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
