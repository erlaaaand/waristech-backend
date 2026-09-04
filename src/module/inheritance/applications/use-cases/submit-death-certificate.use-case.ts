import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SubmitDeathCertificateDto } from '../dto/submit-death-certificate.dto';
import { DeathVerificationResponseDto } from '../dto/inheritance-response.dto';
import {
  DEATH_VERIFICATION_REPOSITORY_TOKEN,
  type IDeathVerificationRepository,
} from '../../domains/repositories/death-verification.repository.interface';

@Injectable()
export class SubmitDeathCertificateUseCase {
  constructor(
    @Inject(DEATH_VERIFICATION_REPOSITORY_TOKEN)
    private readonly deathVerificationRepo: IDeathVerificationRepository,
  ) {}

  async execute(
    submittedByUserId: string,
    dto: SubmitDeathCertificateDto,
  ): Promise<DeathVerificationResponseDto> {
    const verification = await this.deathVerificationRepo.create({
      id: randomUUID(),
      pewarisId: dto.pewarisId,
      documentUrl: dto.documentUrl,
      submittedByUserId,
    });

    return {
      id: verification.id,
      pewarisId: verification.pewarisId,
      documentUrl: verification.documentUrl,
      verifiedByNotarisId: verification.verifiedByNotarisId,
      verifiedAt: verification.verifiedAt,
      createdAt: verification.createdAt,
    };
  }
}
