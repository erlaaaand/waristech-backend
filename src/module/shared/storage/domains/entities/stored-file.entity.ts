// src/shared/storage/domains/entities/stored-file.entity.ts
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { UserEntity } from '../../../../identity/users/domains/entities/user.entity';

export type StorageProvider = 'local' | 's3' | 'cloudinary';

// Tambahan: Enum untuk membedakan fungsi file yang diunggah
export enum FilePurpose {
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  ORIGINALITY_STATEMENT = 'ORIGINALITY_STATEMENT',
  COMPETITION_WORK = 'COMPETITION_WORK',
  PAYMENT_PROOF = 'PAYMENT_PROOF',
  OTHER = 'OTHER',
  GENERAL = 'GENERAL',
}

@Entity({ name: 'stored_files' })
export class StoredFileEntity {
  // ── Primary Key ──────────────────────────────────────────────
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = randomUUID();
    }
  }

  // ── Foreign Key: siapa yang mengupload ──────────────────────
  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  // ── File Metadata ────────────────────────────────────────────
  @Column({ type: 'varchar', length: 512, nullable: false })
  fileKey: string = '';

  // Diubah dari imageUrl menjadi fileUrl agar mencakup PDF/dokumen lain
  @Column({ type: 'varchar', length: 512, nullable: false })
  fileUrl: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false })
  originalName: string = '';

  @Column({ type: 'varchar', length: 100, nullable: false })
  mimeType: string = '';

  @Column({ type: 'int', unsigned: true, nullable: false })
  sizeInBytes: number = 0;

  // Tambahan: Kategori file
  @Column({
    type: 'enum',
    enum: FilePurpose,
    default: FilePurpose.OTHER,
  })
  purpose: FilePurpose = FilePurpose.OTHER;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'local' })
  provider: StorageProvider = 'local';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;
}

export class RawUploadedFile {
  buffer: Buffer = Buffer.alloc(0);
  originalName: string = '';
  mimeType: string = '';
  sizeInBytes: number = 0;
}
