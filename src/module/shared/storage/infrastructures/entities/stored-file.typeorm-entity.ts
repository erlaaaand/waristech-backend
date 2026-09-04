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
import { UserTypeOrmEntity } from '../../../../identity/users/infrastructures/entities/user.typeorm-entity';
import { FilePurpose } from '../../domains/enums/stored-file.enum';
import type { StorageProvider } from '../../domains/enums/stored-file.enum';

@Entity({ name: 'stored_files' })
export class StoredFileTypeOrmEntity {
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

  @Column({ type: 'varchar', length: 512, nullable: false })
  fileUrl: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false })
  originalName: string = '';

  @Column({ type: 'varchar', length: 100, nullable: false })
  mimeType: string = '';

  @Column({ type: 'int', unsigned: true, nullable: false })
  sizeInBytes: number = 0;

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
  @ManyToOne(() => UserTypeOrmEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserTypeOrmEntity>;
}
