/**
 * Kategori pemegang bagian kunci (Shamir's Secret Sharing, threshold 2-dari-3).
 * Tidak ada satu pihak pun yang menyimpan kunci utuh — minimal 2 dari 3 bagian
 * ini wajib dikombinasikan untuk merekonstruksi kredensial aset.
 */
export enum KeyShareHolder {
  EXECUTOR = 'EXECUTOR',
  NOTARIS = 'NOTARIS',
  SYSTEM = 'SYSTEM',
}
