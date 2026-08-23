import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpService {
  /**
   * Generates a 6-digit numeric OTP code.
   */
  generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Calculates the expiration date for an OTP based on the provided minutes.
   */
  calculateExpiration(minutesValid: number): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + minutesValid);
    return expiresAt;
  }
}
