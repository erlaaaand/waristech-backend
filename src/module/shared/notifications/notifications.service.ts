import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
} from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { UserRole } from '../../identity/users/domains/entities/user.entity';
import { UserTypeOrmEntity } from '../../identity/users/infrastructures/entities/user.typeorm-entity';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(UserTypeOrmEntity)
    private readonly userRepo: Repository<UserTypeOrmEntity>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // 1. Membuat dan menyimpan notifikasi lalu memancarkannya
  async sendNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    const notification = this.notificationRepo.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type || NotificationType.INFO,
    });

    const saved = await this.notificationRepo.save(notification);

    // Kirim secara real-time ke user
    this.notificationsGateway.sendToUser(dto.userId, 'new_notification', saved);

    return saved;
  }

  // 1b. Mengirim notifikasi berdasarkan role (misal: PEWARIS, AHLI_WARIS, ADMIN)
  async sendToRoles(
    roles: UserRole[],
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<void> {
    const users = await this.userRepo.find({
      where: { role: In(roles) },
      select: { id: true },
    });

    for (const user of users) {
      await this.sendNotification({
        ...dto,
        userId: user.id,
      });
    }
  }

  // 2. Mendapatkan semua notifikasi pengguna (yang belum dan sudah dibaca)
  async getUserNotifications(userId: string): Promise<NotificationEntity[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50, // limit 50 notifikasi terakhir
    });
  }

  // 3. Menandai notifikasi sebagai telah dibaca
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepo.update(
      { id: notificationId, userId },
      { isRead: true },
    );
  }

  // 4. Menandai SEMUA notifikasi sebagai telah dibaca
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}
