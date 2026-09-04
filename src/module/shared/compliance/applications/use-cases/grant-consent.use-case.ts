import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../../identity/users/domains/repositories/user.repository.interface';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../../../config/privacy-policy.constant';
import { AuditLogService } from '../../../audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../audit/domains/enums/audit.enum';

/**
 * Menyetujui (atau menyetujui ulang) kebijakan pemrosesan data pribadi.
 * Dipakai saat versi kebijakan berubah dan pengguna lama perlu memperbarui
 * persetujuannya — UU PDP No. 27/2022 mewajibkan persetujuan yang eksplisit
 * dan dapat dibuktikan untuk setiap versi kebijakan.
 */
@Injectable()
export class GrantConsentUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    userId: string,
  ): Promise<{ consentGivenAt: Date; consentVersion: string }> {
    const consentGivenAt = new Date();

    await this.userRepo.update(userId, {
      consentGivenAt,
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    this.auditLogService.logAsync({
      action: AuditAction.CONSENT_GRANTED,
      category: AuditCategory.SECURITY,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId },
      resource: 'data_protection',
      resourceId: userId,
      description: `Pengguna (${userId}) memberikan persetujuan pemrosesan data pribadi versi ${CURRENT_PRIVACY_POLICY_VERSION}.`,
      metadata: {
        consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
        consentGivenAt: consentGivenAt.toISOString(),
      },
    });

    return {
      consentGivenAt,
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    };
  }
}
