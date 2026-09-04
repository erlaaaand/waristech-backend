import { KeyShareHolder } from '../enums/key-share.enum';

export const SECRET_SHARING_SERVICE_TOKEN = Symbol('ISecretSharingService');

export interface SplitShareResult {
  holder: KeyShareHolder;
  /**
   * Nilai bagian kunci Shamir dalam bentuk MENTAH (belum dienkripsi server).
   * Bagian milik EXECUTOR & NOTARIS meninggalkan server dan tidak boleh
   * dienkripsi dengan kunci server — pemegangnya tidak akan bisa membukanya.
   */
  rawShare: string;
}

export interface ISecretSharingService {
  /**
   * Pecah `plainText` menjadi 3 bagian (Shamir's Secret Sharing, threshold 2).
   * Setiap bagian sendirian TIDAK mengungkap informasi apa pun tentang rahasia asli.
   */
  splitSecret(plainText: string): Promise<SplitShareResult[]>;

  /**
   * Bungkus bagian milik SYSTEM untuk disimpan-at-rest di database server.
   * HANYA bagian SYSTEM yang boleh melewati fungsi ini.
   */
  sealSystemShare(rawShare: string, assetId: string): string;

  /** Buka kembali bagian SYSTEM dari penyimpanan, untuk dikirim ke klien. */
  unsealSystemShare(sealedShare: string, assetId: string): string;
}

/**
 * CATATAN ARSITEKTUR — kenapa tidak ada `reconstructSecret()` di sini.
 *
 * Rekonstruksi kunci WAJIB terjadi di sisi klien (aplikasi Pewaris/Ahli Waris),
 * bukan di backend. Server hanya menyimpan 1 dari 3 bagian (SYSTEM), sehingga
 * secara struktural tidak memiliki cukup bahan untuk merekonstruksi sendiri —
 * bahkan bila database diretas atau administrator server berniat jahat.
 *
 * Jangan menambahkan method rekonstruksi ke service ini. Menambahkannya akan
 * membatalkan jaminan "tidak ada satu pihak pun yang memegang kunci utuh"
 * yang menjadi klaim keamanan inti WarisTech.
 */
