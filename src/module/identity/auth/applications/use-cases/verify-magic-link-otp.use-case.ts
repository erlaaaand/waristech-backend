import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { VerifyMagicLinkOtpDto } from '../dto/verify-magic-link-otp.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { IWitnessRepository } from '../../../../inheritance/infrastructures/repositories/witness.repository.interface';
import { TokenService } from '../../domains/services/token.service';
import { UserRole } from '../../../users/domains/entities/user.entity';

@Injectable()
export class VerifyMagicLinkOtpUseCase {
  constructor(
    private readonly witnessRepo: IWitnessRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: VerifyMagicLinkOtpDto): Promise<AuthResponseDto> {
    const witness = await this.witnessRepo.findByToken(dto.token);

    if (!witness) {
      throw new UnauthorizedException('Token tidak valid atau tidak ditemukan');
    }

    if (witness.tokenExpiresAt && new Date() > witness.tokenExpiresAt) {
      throw new UnauthorizedException('Magic link telah kadaluarsa');
    }

    // Dummy OTP check for now
    if (dto.otp !== '123456') {
      throw new BadRequestException('Invalid OTP');
    }

    const payload = {
      sub: witness.id,
      email: witness.email,
      role: UserRole.GUEST,
    };

    const accessToken = this.tokenService.generateAccessToken(payload);

    // Invalidate the token after successful login
    witness.magicLinkToken = null;
    witness.tokenExpiresAt = null;
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
