import { Controller, Get, Patch, Param, UseGuards, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../identity/auth/interface/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/interface/guards/roles.guard';
import { Roles } from '../../identity/auth/interface/decorators/roles.decorator';
import { UserRole } from '../../identity/users/domains/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../identity/auth/interface/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  async getMyNotifications(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getUserNotifications(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.notificationsService.markAsRead(id, userId);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Post('blast-deadline')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Blast deadline reminder to all participants (Admin Only)',
  })
  async blastDeadline() {
    await this.notificationsService.sendToRoles([UserRole.CUSTOMER], {
      title: 'Peringatan Deadline',
      message:
        'Halo Peserta! Jangan lupa untuk segera mengunggah karya Anda sebelum batas waktu yang telah ditentukan.',
      type: 'WARNING',
    });
    return { success: true, message: 'Deadline reminder blasted' };
  }
}
