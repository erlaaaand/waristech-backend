import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../../identity/users/domains/repositories/user.repository.interface';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../../../config/privacy-policy.constant';

export interface MyConsentResponse {
  hasGivenConsent: boolean;
  consentGivenAt: Date | null;
  consentVersion: string | null;
  currentPolicyVersion: string;
  isUpToDate: boolean;
}

@Injectable()
export class GetMyConsentUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string): Promise<MyConsentResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    return {
      hasGivenConsent: user.hasGivenConsent(),
      consentGivenAt: user.consentGivenAt,
      consentVersion: user.consentVersion,
      currentPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      isUpToDate: user.consentVersion === CURRENT_PRIVACY_POLICY_VERSION,
    };
  }
}
