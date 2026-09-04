import { Injectable, Logger } from '@nestjs/common';
import { ISmsSender } from './sms-sender.interface';

/**
 * Implementasi SMS berbasis log — placeholder yang JUJUR.
 *
 * Proyek belum berlangganan gateway SMS/WhatsApp mana pun. Ketimbang membuat
 * seolah-olah pesan terkirim, adapter ini mencatat pesan ke log server sehingga
 * alurnya dapat diuji end-to-end, dan penggantian ke provider sungguhan (Twilio,
 * Vonage, WhatsApp Business API) cukup dengan menukar binding SMS_SENDER_TOKEN
 * di NotificationsModule — tanpa menyentuh satu pun use-case pemanggilnya.
 */
@Injectable()
export class LogSmsSender implements ISmsSender {
  private readonly logger = new Logger(LogSmsSender.name);

  send(phoneNumber: string, message: string): Promise<void> {
    this.logger.warn(
      `[SMS TIDAK TERKIRIM — belum ada provider] Tujuan: ${phoneNumber} | Pesan: "${message}"`,
    );
    return Promise.resolve();
  }
}
