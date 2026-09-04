import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubmitWitnessDecisionDto } from '../dto/submit-witness-decision.dto';
import { IWitnessRepository } from '../../domains/repositories/witness.repository.interface';
import { WitnessStatus } from '../../domains/enums/witness.enum';
import {
  DEATH_VERIFICATION_REPOSITORY_TOKEN,
  type IDeathVerificationRepository,
} from '../../domains/repositories/death-verification.repository.interface';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

/** Jumlah minimum pihak yang wajib terlibat dalam verifikasi kematian berjenjang. */
const MINIMUM_WITNESS_COUNT = 3;

@Injectable()
export class SubmitWitnessDecisionUseCase {
  constructor(
    private readonly witnessRepo: IWitnessRepository,
    @Inject(DEATH_VERIFICATION_REPOSITORY_TOKEN)
    private readonly deathVerificationRepo: IDeathVerificationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    dto: SubmitWitnessDecisionDto,
    guestUserId: string,
  ): Promise<{ message: string }> {
    const witness = await this.witnessRepo.findById(dto.witnessId);
    if (!witness) {
      throw new NotFoundException('Witness not found');
    }

    if (witness.id !== guestUserId) {
      throw new UnauthorizedException(
        'Anda tidak berhak membuat keputusan untuk Saksi ini',
      );
    }

    // Ensure the witness is pending (pengecekan cepat — gerbang sebenarnya
    // ada di UPDATE bersyarat di bawah, yang atomik terhadap race condition).
    if (witness.status !== WitnessStatus.PENDING) {
      throw new BadRequestException('Witness has already submitted a decision');
    }

    if (
      dto.decision !== WitnessStatus.APPROVE &&
      dto.decision !== WitnessStatus.DISPUTE
    ) {
      throw new BadRequestException('Invalid decision');
    }

    // Update the witness decision — UPDATE bersyarat (WHERE status=PENDING)
    // supaya dua request bersamaan dari saksi yang sama tidak bisa
    // memancarkan event `inheritance.disputed`/`inheritance.approved` dua kali.
    const applied = await this.witnessRepo.updateStatusIfPending(
      witness.id,
      dto.decision,
    );
    if (!applied) {
      throw new BadRequestException('Witness has already submitted a decision');
    }

    if (dto.decision === WitnessStatus.DISPUTE) {
      // Trigger asset freezing mechanism via Event to adhere to Clean Architecture boundaries
      this.eventEmitter.emit('inheritance.disputed', witness.pewarisId);
    } else if (dto.decision === WitnessStatus.APPROVE) {
      const allWitnesses = await this.witnessRepo.findByPewarisId(
        witness.pewarisId,
      );
      const allApproved = allWitnesses.every(
        (w) => w.status === WitnessStatus.APPROVE,
      );

      if (allApproved) {
        const hasMinimumWitnesses =
          allWitnesses.length >= MINIMUM_WITNESS_COUNT;

        const deathVerifications =
          await this.deathVerificationRepo.findByPewarisId(witness.pewarisId);
        const hasOfficialVerification = deathVerifications.some((v) =>
          v.isVerified(),
        );

        if (hasMinimumWitnesses && hasOfficialVerification) {
          // Trigger asset unlocking mechanism via Event
          this.eventEmitter.emit('inheritance.approved', witness.pewarisId);

          this.auditLogService.logAsync({
            action: AuditAction.INHERITANCE_VERIFICATION_APPROVED,
            category: AuditCategory.WARIS_FAMILY,
            severity: AuditSeverity.WARNING,
            actor: { userId: guestUserId },
            resource: 'witnesses',
            resourceId: witness.pewarisId,
            description: `Verifikasi kematian Pewaris (${witness.pewarisId}) disetujui penuh oleh ${allWitnesses.length} saksi dan dokumen resmi terverifikasi. Proses transisi aset dimulai.`,
          });
        } else {
          // Semua saksi sudah approve, tapi syarat berjenjang belum terpenuhi —
          // proses transisi aset ditahan sampai syarat lengkap.
          this.auditLogService.logAsync({
            action: AuditAction.INHERITANCE_VERIFICATION_GATE_BLOCKED,
            category: AuditCategory.WARIS_FAMILY,
            severity: AuditSeverity.WARNING,
            actor: { userId: guestUserId },
            resource: 'witnesses',
            resourceId: witness.pewarisId,
            description:
              `Semua saksi (${allWitnesses.length}) sudah approve untuk Pewaris (${witness.pewarisId}), ` +
              `namun proses transisi aset BELUM dimulai karena: ` +
              `${!hasMinimumWitnesses ? `jumlah saksi kurang dari minimum ${MINIMUM_WITNESS_COUNT}; ` : ''}` +
              `${!hasOfficialVerification ? 'dokumen akta kematian resmi belum diverifikasi.' : ''}`,
          });
        }
      }
    }

    return { message: 'Decision submitted successfully' };
  }
}
