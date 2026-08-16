// src/auth/applications/use-cases/login.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthValidator } from '../../domains/validators/auth.validator';
import { AuthMapper } from '../../domains/mappers/auth.mapper';
import { TokenService } from '../../domains/services/token.service';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../../users/infrastructures/repositories/user.repository.interface';
import { UserLoggedInEvent } from '../../infrastructures/events/user-logged-in.event';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly validator: AuthValidator,
    private readonly mapper: AuthMapper,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findByEmail(dto.email);

    await this.validator.assertPasswordValid(
      dto.password,
      user?.password ?? null,
    );

    this.validator.assertUserExists(user);

    this.validator.assertUserIsActive(user);

    const payload = this.mapper.toJwtPayload(user);
    const accessToken = this.tokenService.generateAccessToken(payload);
    const expiresIn = this.tokenService.getExpiresIn();

    this.eventEmitter.emit(
      'auth.user_logged_in',
      new UserLoggedInEvent(user.id, user.email, new Date()),
    );

    return this.mapper.toAuthResponseDto(accessToken, expiresIn, user);
  }
}
