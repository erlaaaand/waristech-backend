import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import { SetCalculationPreferenceDto } from '../dto/set-calculation-preference.dto';
import { CalculationMethod } from '../../domains/enums/calculation.enum';

@Injectable()
export class SetCalculationPreferenceUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    pewarisId: string,
    dto: SetCalculationPreferenceDto,
  ): Promise<{ preferredCalculationMethod: CalculationMethod }> {
    await this.userRepo.update(pewarisId, {
      preferredCalculationMethod: dto.method,
    });

    return { preferredCalculationMethod: dto.method };
  }
}
