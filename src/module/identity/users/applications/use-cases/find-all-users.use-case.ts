import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
  type FindAllUsersQuery,
  type PaginatedResult,
} from '../../infrastructures/repositories/user.repository.interface';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserMapper } from '../../domains/mappers/user.mapper';

@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly userMapper: UserMapper,
  ) {}

  async execute(
    query: FindAllUsersQuery = {},
  ): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.userRepo.findAllPaginated(query);
    return {
      ...result,
      data: result.data.map((u) => this.userMapper.toResponseDto(u)),
    };
  }
}
