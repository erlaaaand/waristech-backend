import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { UserEntity } from '../../identity/users/domains/entities/user.entity';

@Global() // Jadikan global agar mudah dipanggil dari service mana saja tanpa perlu import module terus
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, UserEntity]),
    JwtModule.register({}),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService], // Ekspor service agar bisa dipanggil (misal: saat payment di-approve)
})
export class NotificationsModule {}
