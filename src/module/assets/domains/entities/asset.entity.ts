import { AssetType, AssetStatus, AssetCustodyType } from '../enums/asset.enum';
import { AssetAllocationDomain } from './asset-allocation.entity';
import { AssetAllocationExceededException } from '../exceptions/asset.exception';

export { AssetType, AssetStatus, AssetCustodyType };

export class AssetDomain {
  constructor(
    public readonly id: string,
    public readonly pewarisId: string,
    public readonly type: AssetType,
    public readonly assetName: string, // Nama portofolio/aset (misal: "Tabungan Pensiun BCA")
    public readonly platform: string, // Nama platform (misal: "Binance", "GoPay", "BCA")
    public readonly accountIdentifier: string, // Username / email / nomor rekening / nomor telepon
    /**
     * Legacy: kredensial terenkripsi kunci-tunggal (aset pra Secret Sharing).
     * Read-only — kredensial baru TIDAK pernah masuk field ini. Perubahan kunci
     * dilakukan lewat rotasi bagian Shamir di sisi klien.
     */
    private readonly encryptedSecret: string,
    public readonly custodyType: AssetCustodyType,
    public readonly status: AssetStatus,
    public readonly verifiedByNotarisId: string | null,
    public readonly verifiedAt: Date | null,
    public readonly cooldownEndsAt: Date | null,
    public readonly keysRotatedAt: Date | null,
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

  /** Aset yang kredensialnya dititipkan & dipecah Shamir (punya bagian kunci). */
  isVaultCustody(): boolean {
    return this.custodyType === AssetCustodyType.VAULT;
  }

  /** Aset tanpa penitipan kredensial — ahli waris menempuh prosedur resmi lembaga. */
  isGuidanceOnly(): boolean {
    return this.custodyType === AssetCustodyType.GUIDANCE;
  }

  /** Kembalikan secret terenkripsi untuk disimpan. Jangan expose ke response. */
  getEncryptedSecret(): string {
    return this.encryptedSecret;
  }

  /**
   * Validasi agregat alokasi: total persentase tidak boleh melebihi 100%.
   * @param newPercentage Persentase yang akan ditambahkan.
   * @param excludeAhliWarisId Bila diisi, alokasi ahli waris ini DIKECUALIKAN
   *   dari total saat ini — dipakai saat mengoreksi alokasi yang sudah ada
   *   (bukan menambah ahli waris baru), supaya nilai lama tidak dihitung dua kali.
   */
  validateNewAllocation(
    newPercentage: number,
    excludeAhliWarisId?: string,
  ): void {
    const current = this.allocations
      .filter((a) => a.ahliWarisId !== excludeAhliWarisId)
      .reduce((sum, a) => sum + a.percentage, 0);
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

  /** ID ahli waris (non-eksekutor) yang belum mengonfirmasi (acknowledge) penerimaan bagian. */
  getUnacknowledgedHeirIds(): string[] {
    return this.allocations
      .filter((a) => !a.isExecutor && a.acknowledgedAt === null)
      .map((a) => a.ahliWarisId);
  }

  /** Apakah masa tunda (cooling-off) 14 hari sudah lewat dan brankas siap dibuka. */
  isCooldownExpired(): boolean {
    return (
      this.status === AssetStatus.PENDING_COOLDOWN &&
      this.cooldownEndsAt !== null &&
      this.cooldownEndsAt <= new Date()
    );
  }
}
