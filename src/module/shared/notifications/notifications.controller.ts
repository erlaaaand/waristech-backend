import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../identity/auth/interface/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/auth/interface/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../identity/auth/domains/entities/jwt-payload.entity';
import { NotificationEntity } from './entities/notification.entity';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Mendapatkan semua notifikasi pengguna yang sedang login',
  })
  @ApiOkResponse({ description: 'Daftar notifikasi pengguna.' })
  async getMyNotifications(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationEntity[]> {
    return this.notificationsService.getUserNotifications(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Tandai satu notifikasi sebagai telah dibaca' })
  @ApiOkResponse({ description: 'Notifikasi berhasil ditandai telah dibaca.' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markAsRead(id, user.sub);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Tandai semua notifikasi sebagai telah dibaca' })
  @ApiOkResponse({
    description: 'Semua notifikasi berhasil ditandai telah dibaca.',
  })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markAllAsRead(user.sub);
    return { success: true };
  }
}
