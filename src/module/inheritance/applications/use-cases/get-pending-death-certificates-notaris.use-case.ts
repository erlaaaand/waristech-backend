import { Inject, Injectable } from '@nestjs/common';
import {
  DEATH_VERIFICATION_REPOSITORY_TOKEN,
  type IDeathVerificationRepository,
} from '../../domains/repositories/death-verification.repository.interface';
import { DeathVerificationResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class GetPendingDeathCertificatesNotarisUseCase {
  constructor(
    @Inject(DEATH_VERIFICATION_REPOSITORY_TOKEN)
    private readonly repository: IDeathVerificationRepository,
  ) {}

  async execute(): Promise<DeathVerificationResponseDto[]> {
    const pending = await this.repository.findPending();
    return pending.map((m) => ({
      id: m.id,
      pewarisId: m.pewarisId,
      documentUrl: m.documentUrl,
      submittedByUserId: m.submittedByUserId,
      verifiedByNotarisId: m.verifiedByNotarisId,
      verifiedAt: m.verifiedAt,
      createdAt: m.createdAt,
    }));
  }
}
