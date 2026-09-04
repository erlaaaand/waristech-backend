import { InvitationDomain } from '../entities/invitation.entity';

export const INVITATION_REPOSITORY_TOKEN = Symbol(
  'INVITATION_REPOSITORY_TOKEN',
);

export interface IInvitationRepository {
  create(data: {
    id: string;
    code: string;
    pewarisId: string;
    expiresAt: Date;
  }): Promise<InvitationDomain>;

  findByCode(code: string): Promise<InvitationDomain | null>;

  findByPewarisId(pewarisId: string): Promise<InvitationDomain[]>;

  /**
   * Klaim kode undangan secara ATOMIK: hanya berhasil bila status saat ini
   * PENDING dan belum kedaluwarsa (UPDATE bersyarat, bukan read-lalu-write).
   * Ini gerbang tunggal yang mencegah kode yang sama dipakai dua kali secara
   * bersamaan (race condition). `usedByAhliWarisId` belum diisi di sini —
   * gunakan `setRedeemedBy` setelah akun ahli waris berhasil dibuat.
   * Melempar exception spesifik (NotFound/AlreadyUsed/Expired) bila gagal.
   */
  claimPending(code: string): Promise<InvitationDomain>;

  /** Catat siapa yang berhasil menukarkan kode (dipanggil setelah klaim berhasil). */
  setRedeemedBy(code: string, ahliWarisId: string): Promise<void>;

  /**
   * Lepas klaim (kembalikan ke PENDING) — dipakai sebagai best-effort rollback
   * bila ada langkah SETELAH claimPending yang gagal sebelum sempat
   * setRedeemedBy, supaya kode undangan tidak "hangus" sia-sia.
   */
  releaseClaim(code: string): Promise<void>;

  markExpiredByPewarisId(pewarisId: string): Promise<void>;
}
