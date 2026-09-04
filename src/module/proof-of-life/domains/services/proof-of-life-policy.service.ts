import { Injectable } from '@nestjs/common';
import { ProofOfLifeStage } from '../enums/proof-of-life-stage.enum';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Interval wajib Pewaris melakukan konfirmasi aktif ("Check-in"). */
export const CHECK_IN_INTERVAL_DAYS = 30;
/** Akhir Tahap Peringatan: checkpoint + 14 hari. */
export const WARNING_STAGE_END_DAYS = CHECK_IN_INTERVAL_DAYS + 14;
/** Akhir Tahap Kontak Darurat: checkpoint + 30 hari. Setelah ini masuk Verifikasi Resmi. */
export const EMERGENCY_CONTACT_STAGE_END_DAYS = CHECK_IN_INTERVAL_DAYS + 30;

@Injectable()
export class ProofOfLifePolicyService {
  /**
   * Tentukan tahap Proof-of-Life berdasarkan seberapa lama sejak check-in terakhir.
   * Mengikuti proposal: Peringatan (hari 1-14 pasca-checkpoint) → Kontak Darurat
   * (hari 15-30 pasca-checkpoint) → Verifikasi Resmi (>hari 30 pasca-checkpoint).
   */
  determineStage(lastCheckInAt: Date, now: Date): ProofOfLifeStage {
    const daysSinceCheckIn = Math.floor(
      (now.getTime() - lastCheckInAt.getTime()) / DAY_MS,
    );

    if (daysSinceCheckIn <= CHECK_IN_INTERVAL_DAYS) {
      return ProofOfLifeStage.ACTIVE;
    }
    if (daysSinceCheckIn <= WARNING_STAGE_END_DAYS) {
      return ProofOfLifeStage.WARNING;
    }
    if (daysSinceCheckIn <= EMERGENCY_CONTACT_STAGE_END_DAYS) {
      return ProofOfLifeStage.EMERGENCY_CONTACT;
    }
    return ProofOfLifeStage.FORMAL_VERIFICATION;
  }

  /** Batas checkpoint awal (30 hari) — dipakai untuk query "siapa saja yang overdue". */
  getCheckpointThreshold(now: Date): Date {
    return new Date(now.getTime() - CHECK_IN_INTERVAL_DAYS * DAY_MS);
  }
}
