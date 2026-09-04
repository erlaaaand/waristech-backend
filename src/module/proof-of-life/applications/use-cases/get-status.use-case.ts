import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import {
  ProofOfLifePolicyService,
  CHECK_IN_INTERVAL_DAYS,
} from '../../domains/services/proof-of-life-policy.service';
import { ProofOfLifeStatusDto } from '../dto/proof-of-life-status.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly policyService: ProofOfLifePolicyService,
  ) {}

  async execute(userId: string): Promise<ProofOfLifeStatusDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const now = new Date();
    const nextCheckInDueAt = new Date(
      user.lastCheckInAt.getTime() + CHECK_IN_INTERVAL_DAYS * DAY_MS,
    );
    const daysUntilDue = Math.ceil(
      (nextCheckInDueAt.getTime() - now.getTime()) / DAY_MS,
    );

    return {
      lastCheckInAt: user.lastCheckInAt,
      stage: this.policyService.determineStage(user.lastCheckInAt, now),
      nextCheckInDueAt,
      daysUntilDue,
    };
  }
}
