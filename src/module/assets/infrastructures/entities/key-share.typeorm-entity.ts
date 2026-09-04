import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';

@Entity({ name: 'asset_key_shares' })
@Unique(['assetId', 'holder'])
export class KeyShareTypeOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @Index()
  @Column({ type: 'varchar', length: 36 })
  assetId: string = '';

  @Column({ type: 'enum', enum: KeyShareHolder })
  holder: KeyShareHolder = KeyShareHolder.SYSTEM;

  @Column({ type: 'text' })
  encryptedShare: string = '';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();
}
