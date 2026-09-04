import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import { IWitnessRepository } from '../../../inheritance/domains/repositories/witness.repository.interface';
import { GenerateMagicLinkUseCase } from '../../../identity/auth/applications/use-cases/generate-magic-link.use-case';
import { MailService } from '../../../shared/mail/mail.service';
import {
  SMS_SENDER_TOKEN,
  type ISmsSender,
} from '../../../shared/notifications/sms/sms-sender.interface';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';
import { ProofOfLifePolicyService } from '../../domains/services/proof-of-life-policy.service';
import { ProofOfLifeStage } from '../../domains/enums/proof-of-life-stage.enum';

/**
 * ProofOfLifeSchedulerService
 *
 * Menjalankan pemeriksaan harian status aktif Pewaris (Modul Proof-of-Life Bertahap):
 * Tahap Peringatan → Tahap Kontak Darurat → Tahap Verifikasi Resmi (otomatis).
 * Jalur manual verifikasi (siapa pun memicu langsung) tetap berjalan terpisah,
 * tidak digantikan — ini hanya menambah jalur pemicu otomatis.
 */
@Injectable()
export class ProofOfLifeSchedulerService {
  private readonly logger = new Logger(ProofOfLifeSchedulerService.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly witnessRepo: IWitnessRepository,
    private readonly generateMagicLinkUc: GenerateMagicLinkUseCase,
    private readonly mailService: MailService,
    @Inject(SMS_SENDER_TOKEN)
    private readonly smsSender: ISmsSender,
    private readonly auditLogService: AuditLogService,
    private readonly policyService: ProofOfLifePolicyService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleProofOfLifeCheck(): Promise<void> {
    this.logger.log('[CRON] Memeriksa status Proof-of-Life Pewaris...');
    const now = new Date();
    const checkpointThreshold = this.policyService.getCheckpointThreshold(now);

    try {
      const overdueUsers =
        await this.userRepo.findOverdueCheckIns(checkpointThreshold);

      for (const user of overdueUsers) {
        const stage = this.policyService.determineStage(
          user.lastCheckInAt,
          now,
        );

        switch (stage) {
          case ProofOfLifeStage.WARNING:
            // Proposal: notifikasi berulang ke e-mail DAN nomor cadangan pengguna.
            await this.mailService.sendProofOfLifeReminder(
              user.email,
              user.fullName,
            );
            if (user.phoneNumber) {
              await this.smsSender.send(
                user.phoneNumber,
                `[WarisTech] Halo ${user.fullName}, mohon lakukan konfirmasi status aktif (check-in) di aplikasi. ` +
                  'Bila tidak ada respons, kami akan menghubungi kontak darurat Anda.',
              );
            }
            break;

          case ProofOfLifeStage.EMERGENCY_CONTACT:
            await this.notifyEmergencyContacts(user.id, user.fullName);
            break;

          case ProofOfLifeStage.FORMAL_VERIFICATION:
            if (!user.proofOfLifeEscalatedAt) {
              await this.triggerFormalVerification(user.id, user.fullName);
            }
            break;

          case ProofOfLifeStage.ACTIVE:
            break;
        }
      }
    } catch (error) {
      this.logger.error(
        '[CRON] Gagal memeriksa status Proof-of-Life',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async notifyEmergencyContacts(
    pewarisId: string,
    pewarisName: string,
  ): Promise<void> {
    const witnesses = await this.witnessRepo.findByPewarisId(pewarisId);
    for (const witness of witnesses) {
      await this.mailService.sendEmergencyContactAlert(
        witness.email,
        witness.name,
        pewarisName,
      );
      if (witness.phone) {
        await this.smsSender.send(
          witness.phone,
          `[WarisTech] Halo ${witness.name}, Anda terdaftar sebagai kontak darurat ${pewarisName}. ` +
            'Kami belum menerima konfirmasi status aktif beliau. Mohon bantu pastikan kabarnya.',
        );
      }
    }
  }

  private async triggerFormalVerification(
    pewarisId: string,
    pewarisName: string,
  ): Promise<void> {
    const witnesses = await this.witnessRepo.findByPewarisId(pewarisId);

    for (const witness of witnesses) {
      await this.generateMagicLinkUc.execute({
        entityId: witness.id,
        email: witness.email,
      });
    }

    await this.userRepo.update(pewarisId, {
      proofOfLifeEscalatedAt: new Date(),
    });

    this.logger.warn(
      `[PROOF-OF-LIFE] Verifikasi kematian formal dipicu otomatis untuk Pewaris ${pewarisId} (tidak ada konfirmasi >60 hari).`,
    );

    this.auditLogService.logAsync({
      action: AuditAction.PROOF_OF_LIFE_FORMAL_VERIFICATION_TRIGGERED,
      category: AuditCategory.WARIS_FAMILY,
      severity: AuditSeverity.CRITICAL,
      actor: { userId: 'system' },
      resource: 'proof-of-life',
      resourceId: pewarisId,
      description: `Pewaris "${pewarisName}" (${pewarisId}) tidak melakukan check-in selama >60 hari. Sistem otomatis mengirim magic link verifikasi ke ${witnesses.length} saksi terdaftar.`,
    });
  }
}
