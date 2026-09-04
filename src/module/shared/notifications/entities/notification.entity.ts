import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  Index,
  type Relation,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { UserTypeOrmEntity } from '../../../identity/users/infrastructures/entities/user.typeorm-entity';

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

@Entity({ name: 'notifications' })
export class NotificationEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = randomUUID();
    }
  }

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @ManyToOne(() => UserTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserTypeOrmEntity>;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string = '';

  @Column({ type: 'text', nullable: false })
  message: string = '';

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType = NotificationType.INFO;

  @Column({ type: 'boolean', default: false })
  isRead: boolean = false;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();
}
