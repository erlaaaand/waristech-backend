// src/users/applications/use-cases/find-user-by-id.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserMapper } from '../../domains/mappers/user.mapper';
import { UserValidator } from '../../domains/validators/user.validator';
import { USER_REPOSITORY_TOKEN } from '../../infrastructures/repositories/user.repository.interface';
import type { IUserRepository } from '../../infrastructures/repositories/user.repository.interface';

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly validator: UserValidator,
    private readonly mapper: UserMapper,
  ) {}

  async execute(id: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findById(id);
    this.validator.assertExists(user, id);
    return this.mapper.toResponseDto(user);
  }
}
