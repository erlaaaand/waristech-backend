// src/users/applications/use-cases/create-user.use-case.ts
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isDuplicateKeyError } from '../../../../shared/utils/database-error.util';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserDomainService } from '../../domains/services/user-domain.service';
import { UserMapper } from '../../domains/mappers/user.mapper';
import { UserValidator } from '../../domains/validators/user.validator';
import { USER_REPOSITORY_TOKEN } from '../../domains/repositories/user.repository.interface';
import type { IUserRepository } from '../../domains/repositories/user.repository.interface';
import { UserCreatedEvent } from '../../infrastructures/events/user-created.event';
import { UserDomain } from '../../domains/entities/user.entity';

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

  async executeAndReturnEntity(dto: CreateUserDto): Promise<UserDomain> {
    const sanitizedEmail = this.domainService.sanitizeEmail(dto.email);

    const emailTaken = await this.userRepo.existsByEmail(sanitizedEmail);
    this.validator.assertEmailNotTaken(emailTaken, sanitizedEmail);

    if (dto.nik) {
      const nikTaken = await this.userRepo.existsByNik(dto.nik);
      this.validator.assertNikNotTaken(nikTaken, dto.nik);
    }

    const hashedPassword = await this.domainService.hashPassword(dto.password);

    let user: UserDomain;
    try {
      user = await this.userRepo.create({
        email: sanitizedEmail,
        password: hashedPassword,
        fullName: dto.fullName ?? undefined,
        phoneNumber: dto.phoneNumber,
        nik: dto.nik ?? null,
        role: dto.role ?? undefined,
        otpCode: dto.otpCode ?? null,
        otpExpiresAt: dto.otpExpiresAt ?? null,
        isEmailVerified: dto.isEmailVerified ?? false,
        isActive: dto.isActive ?? true,
        consentGivenAt: dto.consentGivenAt ?? null,
        consentVersion: dto.consentVersion ?? null,
      });
    } catch (error: unknown) {
      // Jaring pengaman terhadap race condition: dua request registrasi
      // bersamaan bisa lolos cek existsByEmail/existsByNik di atas sebelum
      // salah satu sempat menyimpan — constraint unik di DB yang jadi
      // penentu akhir (tidak bisa dipastikan field mana yang bentrok dari
      // sini, jadi pesannya generik mencakup keduanya).
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Email atau NIK sudah terdaftar pada akun lain.',
        );
      }
      throw error;
    }

    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(user.id, user.email, user.fullName, new Date()),
    );

    return user;
  }
}
