// src/users/applications/use-cases/find-user-by-email.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserMapper } from '../../domains/mappers/user.mapper';
import { UserValidator } from '../../domains/validators/user.validator';
import { USER_REPOSITORY_TOKEN } from '../../infrastructures/repositories/user.repository.interface';
import type { IUserRepository } from '../../infrastructures/repositories/user.repository.interface';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly validator: UserValidator,
    private readonly mapper: UserMapper,
  ) {}

  async execute(email: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findByEmail(email);
    this.validator.assertExists(user, email);
    return this.mapper.toResponseDto(user);
  }
}
