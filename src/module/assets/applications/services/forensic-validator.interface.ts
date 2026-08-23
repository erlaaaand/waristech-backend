/**
 * Abstraksi untuk validasi forensik bukti pencairan (e-Statement PDF).
 * Implementasi konkret bisa berupa Mock, atau integrasi ke Python ML Engine.
 */
export const FORENSIC_VALIDATOR_TOKEN = Symbol('IForensicValidator');

export interface ForensicValidationResult {
  isValid: boolean;
  notes: string;
}

export interface IForensicValidator {
  /**
   * Memvalidasi keaslian dan integritas file e-Statement PDF.
   * @param pdfUrl URL lokasi file PDF yang sudah diunggah.
   * @param dateRange Rentang tanggal pencairan yang diharapkan.
   * @param pdfPassword Kata sandi PDF (opsional, untuk PDF terkunci).
   * @returns Hasil validasi forensik.
   */
  validateStatement(
    pdfUrl: string,
    dateRange: { from: Date; to: Date },
    pdfPassword?: string,
  ): Promise<ForensicValidationResult>;
}
