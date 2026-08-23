import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationCodeService {
  /**
   * Menghasilkan kode undangan unik berformat: WT-XXXXXX-XXXXXX
   * Mudah dibaca manusia dan aman dari konflik.
   */
  generateCode(): string {
    const part1 = randomBytes(3).toString('hex').toUpperCase();
    const part2 = randomBytes(3).toString('hex').toUpperCase();
    return `WT-${part1}-${part2}`;
  }

  /**
   * Menghitung tanggal kedaluwarsa undangan.
   * @param days — berapa hari kode undangan berlaku (default: 7 hari)
   */
  calculateExpiration(days = 7): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }
}
