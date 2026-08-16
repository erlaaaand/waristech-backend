import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../users/infrastructures/repositories/user.repository.interface';
import { TokenService } from '../../domains/services/token.service';
import { AuthMapper } from '../../domains/mappers/auth.mapper';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
    private readonly mapper: AuthMapper,
  ) {}

  async execute(email: string, otpCode: string): Promise<AuthResponseDto> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User tidak ditemukan.');
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email sudah diverifikasi.');
    }
    if (user.otpCode !== otpCode) {
      throw new BadRequestException('Kode OTP salah.');
    }
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      throw new BadRequestException(
        'Kode OTP sudah kadaluarsa. Silakan minta kode baru.',
      );
    }

    // Update status verifikasi & bersihkan OTP
    const updatedUser = await this.userRepo.update(user.id, {
      isEmailVerified: true,
      isActive: true,
      otpCode: null,
      otpExpiresAt: null,
    });

    // Berikan JWT Token setelah verifikasi sukses
    const payload = this.mapper.toJwtPayload(updatedUser);
    const accessToken = this.tokenService.generateAccessToken(payload);
    return this.mapper.toAuthResponseDto(
      accessToken,
      this.tokenService.getExpiresIn(),
      updatedUser,
    );
  }
}
