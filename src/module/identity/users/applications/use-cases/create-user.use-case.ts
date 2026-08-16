// src/users/applications/use-cases/create-user.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserDomainService } from '../../domains/services/user-domain.service';
import { UserMapper } from '../../domains/mappers/user.mapper';
import { UserValidator } from '../../domains/validators/user.validator';
import { USER_REPOSITORY_TOKEN } from '../../infrastructures/repositories/user.repository.interface';
import type { IUserRepository } from '../../infrastructures/repositories/user.repository.interface';
import { UserCreatedEvent } from '../../infrastructures/events/user-created.event';
import { UserEntity } from '../../domains/entities/user.entity';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly domainService: UserDomainService,
    private readonly validator: UserValidator,
    private readonly mapper: UserMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.executeAndReturnEntity(dto);
    return this.mapper.toResponseDto(user);
  }

  async executeAndReturnEntity(dto: CreateUserDto): Promise<UserEntity> {
    const sanitizedEmail = this.domainService.sanitizeEmail(dto.email);

    const emailTaken = await this.userRepo.existsByEmail(sanitizedEmail);
    this.validator.assertEmailNotTaken(emailTaken, sanitizedEmail);

    const hashedPassword = await this.domainService.hashPassword(dto.password);

    const user = await this.userRepo.create({
      email: sanitizedEmail,
      password: hashedPassword,
      fullName: dto.fullName ?? undefined,
      phoneNumber: dto.phoneNumber,
      otpCode: dto.otpCode ?? null,
      otpExpiresAt: dto.otpExpiresAt ?? null,
      isEmailVerified: dto.isEmailVerified ?? false,
      isActive: dto.isActive ?? true,
    });

    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(user.id, user.email, user.fullName, new Date()),
    );

    return user;
  }
}
