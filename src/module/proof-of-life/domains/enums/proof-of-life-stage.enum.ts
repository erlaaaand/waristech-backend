export enum ProofOfLifeStage {
  /** Check-in masih dalam interval wajar (≤30 hari). */
  ACTIVE = 'ACTIVE',
  /** Hari 1-14 setelah checkpoint 30 hari terlewat — reminder ke Pewaris. */
  WARNING = 'WARNING',
  /** Hari 15-30 setelah checkpoint 30 hari terlewat — notifikasi ke kontak darurat. */
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT',
  /** >Hari 30 setelah checkpoint 30 hari terlewat — picu verifikasi kematian formal. */
  FORMAL_VERIFICATION = 'FORMAL_VERIFICATION',
}
