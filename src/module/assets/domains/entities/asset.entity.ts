import { AssetType, AssetStatus } from '../enums/asset.enum';
import { AssetAllocationDomain } from './asset-allocation.entity';
import {
  AssetAlreadyVerifiedException,
  AssetAllocationExceededException,
} from '../exceptions/asset.exception';

export { AssetType, AssetStatus };

export class AssetDomain {
  constructor(
    public readonly id: string,
    public readonly pewarisId: string,
    public readonly type: AssetType,
    public readonly assetName: string, // Nama portofolio/aset (misal: "Tabungan Pensiun BCA")
    public readonly platform: string, // Nama platform (misal: "Binance", "GoPay", "BCA")
    public readonly accountIdentifier: string, // Username / email / nomor rekening / nomor telepon
    private encryptedSecret: string, // PIN / Password / Seed Phrase — TERENKRIPSI
    public readonly status: AssetStatus,
    public readonly verifiedByNotarisId: string | null,
    public readonly verifiedAt: Date | null,
    public readonly allocations: AssetAllocationDomain[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  // ── Business Rules ────────────────────────────────────────────────────────

  isVerified(): boolean {
    return this.status === AssetStatus.VERIFIED;
  }

  isOwnedBy(pewarisId: string): boolean {
    return this.pewarisId === pewarisId;
  }

  /** Kembalikan secret terenkripsi untuk disimpan. Jangan expose ke response. */
  getEncryptedSecret(): string {
    return this.encryptedSecret;
  }

  /**
   * Update secret (PIN / Password / Seed Phrase).
   * Harus dipanggil SETELAH enkripsi dilakukan di Application Layer.
   * Aset yang sudah VERIFIED tidak boleh diubah.
   */
  updateSecret(newEncryptedSecret: string): void {
    if (this.isVerified()) {
      throw new AssetAlreadyVerifiedException(
        'Kredensial aset yang sudah diverifikasi tidak dapat diubah.',
      );
    }
    this.encryptedSecret = newEncryptedSecret;
  }

  /**
   * Validasi agregat alokasi: total persentase tidak boleh melebihi 100%.
   * @param newPercentage Persentase yang akan ditambahkan.
   */
  validateNewAllocation(newPercentage: number): void {
    const current = this.allocations.reduce((sum, a) => sum + a.percentage, 0);
    if (current + newPercentage > 100) {
      throw new AssetAllocationExceededException(
        `Total alokasi melebihi 100%. Sisa kapasitas: ${(100 - current).toFixed(2)}%.`,
      );
    }
  }

  /** Hitung sisa kapasitas alokasi yang tersedia (0–100). */
  getRemainingAllocationCapacity(): number {
    const allocated = this.allocations.reduce(
      (sum, a) => sum + a.percentage,
      0,
    );
    return 100 - allocated;
  }
}
