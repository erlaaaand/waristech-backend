import { Injectable, Logger } from '@nestjs/common';
import { ReportDataBreachDto } from '../dto/report-data-breach.dto';
import { AuditLogService } from '../../../audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../audit/domains/enums/audit.enum';
import { NotificationsService } from '../../../notifications/notifications.service';
import { NotificationType } from '../../../notifications/entities/notification.entity';

/**
 * ReportDataBreachUseCase (Admin Only)
 *
 * Mencatat insiden kegagalan pelindungan data dan memberitahu pengguna terdampak.
 * UU No. 27 Tahun 2022 (UU PDP) mewajibkan pengendali data menyediakan mekanisme
 * pemberitahuan kepada pengguna bila terjadi kegagalan pelindungan data.
 *
 * Catatan: pemberitahuan resmi ke lembaga pengawas dilakukan di luar sistem;
 * use-case ini menyediakan jejak audit dan notifikasi ke Subjek Data.
 */
@Injectable()
export class ReportDataBreachUseCase {
  private readonly logger = new Logger(ReportDataBreachUseCase.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(
    reportedByAdminId: string,
    dto: ReportDataBreachDto,
  ): Promise<{ message: string; notifiedUserCount: number }> {
    const affectedUserIds = dto.affectedUserIds ?? [];

    this.logger.error(
      `[UU PDP] Insiden pelindungan data dilaporkan oleh admin ${reportedByAdminId}: ${dto.summary}`,
    );

    // 1. Jejak audit permanen (append-only, severity tertinggi).
    this.auditLogService.logAsync({
      action: AuditAction.DATA_BREACH_REPORTED,
      category: AuditCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
      status: AuditStatus.FAILURE,
      actor: { userId: reportedByAdminId },
      resource: 'data_protection',
      description: `Insiden kegagalan pelindungan data dilaporkan: ${dto.summary}`,
      metadata: {
        description: dto.description,
        affectedUserIds,
        affectedUserCount: affectedUserIds.length,
        reportedAt: new Date().toISOString(),
      },
    });

    // 2. Pemberitahuan ke setiap Subjek Data yang terdampak.
    for (const userId of affectedUserIds) {
      await this.notificationsService.sendNotification({
        userId,
        title: 'Pemberitahuan Insiden Pelindungan Data',
        message:
          `Kami mendeteksi insiden yang berpotensi memengaruhi data pribadi Anda: ${dto.summary}. ` +
          'Tim kami sedang menangani insiden ini. Demi keamanan, segera ganti kata sandi akun Anda.',
        type: NotificationType.ERROR,
      });
    }

    return {
      message: `Insiden tercatat di audit trail. ${affectedUserIds.length} pengguna terdampak telah diberitahu.`,
      notifiedUserCount: affectedUserIds.length,
    };
  }
}
