/**
 * Format kanonik nomor HP di seluruh sistem: E.164 Indonesia, mis. "+6281234567890".
 * Dipilih karena tidak ambigu (beda dari "08xxx" yang tidak portable secara
 * internasional) dan merupakan standar yang dipakai penyedia SMS/WhatsApp API.
 * Input pengguna ("08xx", "62xx", "+62xx", dengan spasi/tanda hubung) selalu
 * dikonversi ke bentuk ini sebelum disimpan.
 */
export class PhoneNumberUtil {
  private static readonly COUNTRY_CODE = '62';
  private static readonly PATTERN = /^\+628\d{8,11}$/;

  /**
   * Normalisasi nomor HP Indonesia ke format E.164 (+62...).
   * Mengembalikan null jika input tidak bisa dikonversi jadi nomor HP
   * Indonesia yang valid (bukan meng-throw, supaya pemanggil — decorator
   * @Transform maupun kode lain — bebas memutuskan cara menangani kegagalan).
   */
  static normalize(input: string): string | null {
    if (typeof input !== 'string') return null;
    let digits = input.replace(/[\s-]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);

    if (digits.startsWith('0')) {
      digits = this.COUNTRY_CODE + digits.slice(1);
    } else if (digits.startsWith('8')) {
      digits = this.COUNTRY_CODE + digits;
    }

    if (!/^\d+$/.test(digits)) return null;

    const normalized = `+${digits}`;
    return this.isValid(normalized) ? normalized : null;
  }

  /** Cek apakah nilai SUDAH dalam format kanonik +62 yang valid. */
  static isValid(value: string): boolean {
    return this.PATTERN.test(value);
  }
}
