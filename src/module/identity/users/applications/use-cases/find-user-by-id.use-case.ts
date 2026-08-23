// src/users/applications/use-cases/find-user-by-id.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserMapper } from '../../domains/mappers/user.mapper';
import { UserValidator } from '../../domains/validators/user.validator';
import { USER_REPOSITORY_TOKEN } from '../../infrastructures/repositories/user.repository.interface';
import type { IUserRepository } from '../../infrastructures/repositories/user.repository.interface';

import { AuthenticatedUser } from '../../../auth/domains/entities/jwt-payload.entity';

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly validator: UserValidator,
    private readonly mapper: UserMapper,
  ) {}

  async execute(
    id: string,
    requestingUser?: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.userRepo.findById(id);
    this.validator.assertExists(user, id);

    if (requestingUser) {
      this.validator.assertHasAccessToProfile(requestingUser, id);
    }

    return this.mapper.toResponseDto(user);
  }
}
