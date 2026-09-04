import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationEntity } from './entities/notification.entity';
import { UserTypeOrmEntity } from '../../identity/users/infrastructures/entities/user.typeorm-entity';
import { SMS_SENDER_TOKEN } from './sms/sms-sender.interface';
import { LogSmsSender } from './sms/log-sms-sender.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, UserTypeOrmEntity]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    // Ganti `useClass` di sini saat berlangganan gateway SMS/WhatsApp sungguhan —
    // tidak ada use-case pemanggil yang perlu diubah.
    { provide: SMS_SENDER_TOKEN, useClass: LogSmsSender },
  ],
  exports: [NotificationsService, SMS_SENDER_TOKEN],
})
export class NotificationsModule {}
