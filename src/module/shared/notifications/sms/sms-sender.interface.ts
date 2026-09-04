export const SMS_SENDER_TOKEN = Symbol('ISmsSender');

export interface ISmsSender {
  /**
   * Kirim pesan singkat ke nomor telepon (SMS/WhatsApp).
   * Implementasi TIDAK boleh melempar error ke pemanggil — kegagalan kirim
   * hanya dicatat, agar alur utama (mis. Proof-of-Life) tidak ikut gagal.
   */
  send(phoneNumber: string, message: string): Promise<void>;
}
