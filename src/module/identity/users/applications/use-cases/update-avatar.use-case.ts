// src/users/applications/use-cases/update-avatar.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserMapper } from '../../domains/mappers/user.mapper';
import { UserValidator } from '../../domains/validators/user.validator';
import { USER_REPOSITORY_TOKEN } from '../../infrastructures/repositories/user.repository.interface';
import type { IUserRepository } from '../../infrastructures/repositories/user.repository.interface';

@Injectable()
export class UpdateAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly validator: UserValidator,
    private readonly mapper: UserMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: string, avatarUrl: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findById(userId);

    this.validator.assertExists(user, userId);
    this.validator.assertIsActive(user);

    const previousAvatarUrl = user.avatarUrl;

    const updated = await this.userRepo.update(userId, { avatarUrl });

    if (previousAvatarUrl && previousAvatarUrl !== avatarUrl) {
      this.eventEmitter.emit('user.avatar_updated', {
        userId,
        previousAvatarUrl,
        newAvatarUrl: avatarUrl,
        occurredAt: new Date(),
      });
    }

    return this.mapper.toResponseDto(updated);
  }
}
