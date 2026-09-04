import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { VerifyMagicLinkOtpDto } from '../dto/verify-magic-link-otp.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { IWitnessRepository } from '../../../../inheritance/domains/repositories/witness.repository.interface';
import {
  ITokenService,
  TOKEN_SERVICE_TOKEN,
} from '../../domains/services/token.service.interface';
import { UserRole } from '../../../users/domains/entities/user.entity';
import { CryptoUtil } from '../../../../shared/utils/crypto.util';

@Injectable()
export class VerifyMagicLinkOtpUseCase {
  constructor(
    private readonly witnessRepo: IWitnessRepository,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: VerifyMagicLinkOtpDto): Promise<AuthResponseDto> {
    const witness = await this.witnessRepo.findByToken(dto.token);

    if (!witness) {
      throw new UnauthorizedException('Token tidak valid atau tidak ditemukan');
    }

    if (witness.tokenExpiresAt && new Date() > witness.tokenExpiresAt) {
      throw new UnauthorizedException('Magic link telah kadaluarsa');
    }

    // Verifikasi OTP terhadap kode yang benar-benar dikirimkan ke Saksi.
    if (!witness.otpCode) {
      throw new BadRequestException(
        'Belum ada kode OTP aktif untuk Saksi ini. Minta tautan verifikasi baru.',
      );
    }

    if (!witness.otpExpiresAt || new Date() > witness.otpExpiresAt) {
      throw new BadRequestException(
        'Kode OTP sudah kadaluarsa. Minta tautan verifikasi baru.',
      );
    }

    if (!CryptoUtil.timingSafeEquals(dto.otp, witness.otpCode)) {
      throw new BadRequestException('Kode OTP salah.');
    }

    const payload = {
      sub: witness.id,
      email: witness.email,
      role: UserRole.GUEST,
    };

    const accessToken = this.tokenService.generateAccessToken(payload);

    // Sekali pakai: token DAN OTP langsung dihanguskan setelah login sukses.
    witness.magicLinkToken = null;
    witness.tokenExpiresAt = null;
    witness.otpCode = null;
    witness.otpExpiresAt = null;
    await this.witnessRepo.save(witness);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.getExpiresIn(),
      user: {
        id: witness.id,
        email: witness.email,
        fullName: witness.name,
        role: UserRole.GUEST,
      },
    };
  }
}
