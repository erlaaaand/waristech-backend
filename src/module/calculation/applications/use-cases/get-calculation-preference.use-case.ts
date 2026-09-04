import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import { CalculationMethod } from '../../domains/enums/calculation.enum';

@Injectable()
export class GetCalculationPreferenceUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    pewarisId: string,
  ): Promise<{ preferredCalculationMethod: CalculationMethod | null }> {
    const user = await this.userRepo.findById(pewarisId);
    if (!user) {
      throw new NotFoundException('Pewaris tidak ditemukan.');
    }

    return { preferredCalculationMethod: user.preferredCalculationMethod };
  }
}
