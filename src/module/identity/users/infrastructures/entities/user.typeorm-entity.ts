import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { UserRole } from '../../domains/enums/user.enum';
import { CalculationMethod } from '../../../../calculation/domains/enums/calculation.enum';
import { StoredFileTypeOrmEntity } from '../../../../shared/storage/infrastructures/entities/stored-file.typeorm-entity';

@Entity({ name: 'users' })
export class UserTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = randomUUID();
    }
  }

  // ── Identity ─────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false, select: false })
  password: string = '';

  @Column({ type: 'varchar', length: 150, nullable: false })
  fullName: string = '';

  // unique: true — MySQL/InnoDB mengizinkan banyak NULL pada kolom unik,
  // jadi user tanpa NIK (non-Pewaris) tidak saling bentrok; hanya NIK
  // yang sama persis (non-null) yang ditolak.
  @Column({ type: 'varchar', length: 16, nullable: true, unique: true })
  nik: string | null = null;

  // ── Foto Profil ──────────────────────────────────────────────
  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarUrl: string | null = null;

  // ── Contact & Affiliation ────────
  @Column({ type: 'varchar', length: 20, nullable: false })
  phoneNumber: string = '';

  // ── Status & Role ────────────────────────────────────────────
  @Index()
  @Column({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Index()
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PEWARIS,
  })
  role: UserRole = UserRole.PEWARIS;

  // ── OTP & Verification ───────────────────────────────────────
  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean = false;

  @Column({ type: 'varchar', length: 10, nullable: true })
  otpCode: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiresAt: Date | null = null;

  // ── Reset Password ──────────────────────────────────────────
  @Column({ type: 'varchar', length: 10, nullable: true })
  resetPasswordOtp: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordOtpExpiresAt: Date | null = null;

  // ── Proof-of-Life Bertahap ────────────────────────────────────
  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastCheckInAt: Date = new Date();

  @Column({ type: 'timestamp', nullable: true })
  proofOfLifeEscalatedAt: Date | null = null;

  // ── Preferensi Skema Hukum Waris ──────────────────────────────
  @Column({
    type: 'enum',
    enum: CalculationMethod,
    nullable: true,
  })
  preferredCalculationMethod: CalculationMethod | null = null;

  // ── Persetujuan Data Pribadi (UU PDP No. 27/2022) ─────────────
  @Column({ type: 'timestamp', nullable: true })
  consentGivenAt: Date | null = null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  consentVersion: string | null = null;

  // ── Public Key Notaris (Secret Sharing) ───────────────────────
  // Hanya public key yang disimpan. Private key WAJIB tetap di perangkat
  // Notaris — server tidak boleh pernah melihatnya.
  @Column({ type: 'text', nullable: true })
  publicKey: string | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @OneToMany(() => StoredFileTypeOrmEntity, (file) => file.user, {
    cascade: false,
  })
  storedFiles!: Relation<StoredFileTypeOrmEntity[]>;
}
