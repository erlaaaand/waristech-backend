// src/users/applications/orchestrator/user.orchestrator.ts
import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { CreateUserUseCase } from '../use-cases/create-user.use-case';
import { FindUserByIdUseCase } from '../use-cases/find-user-by-id.use-case';
import { FindUserByEmailUseCase } from '../use-cases/find-user-by-email.use-case';
import { UpdateUserUseCase } from '../use-cases/update-user.use-case';
import { UpdateAvatarUseCase } from '../use-cases/update-avatar.use-case';
import { AdminCreateUserUseCase } from '../use-cases/admin-create-user.use-case';
import { FindAllUsersUseCase } from '../use-cases/find-all-users.use-case';
import { AdminCreateUserDto } from '../dto/admin-create-user.dto';
import {
  type FindAllUsersQuery,
  type PaginatedResult,
} from '../../infrastructures/repositories/user.repository.interface';

@Injectable()
export class UserOrchestrator {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly findById: FindUserByIdUseCase,
    private readonly findByEmail: FindUserByEmailUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly updateAvatarUc: UpdateAvatarUseCase,
    private readonly adminCreateUserUc: AdminCreateUserUseCase,
    private readonly findAllUsersUc: FindAllUsersUseCase,
  ) {}

  getById(id: string): Promise<UserResponseDto> {
    return this.findById.execute(id);
  }

  getByEmail(email: string): Promise<UserResponseDto> {
    return this.findByEmail.execute(email);
  }

  update(
    id: string,
    dto: UpdateUserDto,
    requestingUserId: string,
  ): Promise<UserResponseDto> {
    return this.updateUser.execute(id, dto, requestingUserId);
  }

  updateAvatar(userId: string, avatarUrl: string): Promise<UserResponseDto> {
    return this.updateAvatarUc.execute(userId, avatarUrl);
  }

  adminCreateUser(
    dto: AdminCreateUserDto,
  ): Promise<{ message: string; userId: string }> {
    return this.adminCreateUserUc.execute(dto);
  }

  findAll(
    query: FindAllUsersQuery = {},
  ): Promise<PaginatedResult<UserResponseDto>> {
    return this.findAllUsersUc.execute(query);
  }
}
