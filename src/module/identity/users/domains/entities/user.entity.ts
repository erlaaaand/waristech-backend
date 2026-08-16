// src/identity/users/domains/entities/user.entity.ts
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
import { StoredFileEntity } from '../../../../shared/storage/domains/entities/stored-file.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
}

@Entity({ name: 'users' })
export class UserEntity {
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
    default: UserRole.CUSTOMER,
  })
  role: UserRole = UserRole.CUSTOMER;

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

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @OneToMany(() => StoredFileEntity, (file) => file.user, {
    cascade: false,
  })
  storedFiles!: Relation<StoredFileEntity[]>;
}
