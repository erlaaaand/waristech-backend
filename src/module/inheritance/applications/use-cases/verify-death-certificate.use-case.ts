import { Inject, Injectable } from '@nestjs/common';
import { DeathVerificationResponseDto } from '../dto/inheritance-response.dto';
import {
  DEATH_VERIFICATION_REPOSITORY_TOKEN,
  type IDeathVerificationRepository,
} from '../../domains/repositories/death-verification.repository.interface';
import { DeathVerificationNotFoundException } from '../../domains/exceptions/inheritance.exception';

@Injectable()
export class VerifyDeathCertificateUseCase {
  constructor(
    @Inject(DEATH_VERIFICATION_REPOSITORY_TOKEN)
    private readonly deathVerificationRepo: IDeathVerificationRepository,
  ) {}

  async execute(
    id: string,
    notarisId: string,
  ): Promise<DeathVerificationResponseDto> {
    const verification = await this.deathVerificationRepo.findById(id);
    if (!verification) {
      throw new DeathVerificationNotFoundException();
    }

    const verified = await this.deathVerificationRepo.verify(id, notarisId);

    return {
      id: verified.id,
      pewarisId: verified.pewarisId,
      documentUrl: verified.documentUrl,
      verifiedByNotarisId: verified.verifiedByNotarisId,
      verifiedAt: verified.verifiedAt,
      createdAt: verified.createdAt,
    };
  }
}
