import { Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { RegisterPewarisDto } from '../dto/register-pewaris.dto';
import { RegisterAhliWarisDto } from '../dto/register-ahli-waris.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { VerificationResponseDto } from '../dto/verification-response.dto';
import { LoginUseCase } from '../use-cases/login.use-case';
import { RegisterPewarisUseCase } from '../use-cases/register-pewaris.use-case';
import { RegisterAhliWarisUseCase } from '../use-cases/register-ahli-waris.use-case';
import { LogoutService } from '../use-cases/logout.use-case';
import { VerifyEmailUseCase } from '../use-cases/verify-email.use-case';
import { ForgotPasswordUseCase } from '../use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ResendOtpUseCase } from '../use-cases/resend-otp.use-case';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { GenerateMagicLinkUseCase } from '../use-cases/generate-magic-link.use-case';
import { VerifyMagicLinkOtpUseCase } from '../use-cases/verify-magic-link-otp.use-case';
import { GenerateMagicLinkDto } from '../dto/generate-magic-link.dto';
import { VerifyMagicLinkOtpDto } from '../dto/verify-magic-link-otp.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
@Injectable()
export class AuthOrchestrator {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerPewarisUseCase: RegisterPewarisUseCase,
    private readonly registerAhliWarisUseCase: RegisterAhliWarisUseCase,
    private readonly logoutService: LogoutService,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly resendOtpUseCase: ResendOtpUseCase,
    private readonly generateMagicLinkUseCase: GenerateMagicLinkUseCase,
    private readonly verifyMagicLinkOtpUseCase: VerifyMagicLinkOtpUseCase,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  async registerPewaris(
    dto: RegisterPewarisDto,
  ): Promise<{ message: string; userId: string }> {
    return this.registerPewarisUseCase.execute(dto);
  }

  async registerAhliWaris(
    dto: RegisterAhliWarisDto,
  ): Promise<{ message: string; userId: string }> {
    return this.registerAhliWarisUseCase.execute(dto);
  }

  async logout(userId: string): Promise<{ message: string }> {
    return this.logoutService.execute(userId);
  }

  async verifyEmail(
    email: string,
    otp: string,
  ): Promise<VerificationResponseDto> {
    const result = await this.verifyEmailUseCase.execute(email, otp);

    return {
      ...result,
      message: 'Email berhasil diverifikasi',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.resetPasswordUseCase.execute(
      dto.email,
      dto.otp,
      dto.newPassword,
    );
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    return this.resendOtpUseCase.execute(dto.email);
  }

  async generateMagicLink(
    dto: GenerateMagicLinkDto,
  ): Promise<MessageResponseDto> {
    return this.generateMagicLinkUseCase.execute(dto);
  }

  async verifyMagicLinkOtp(
    dto: VerifyMagicLinkOtpDto,
  ): Promise<AuthResponseDto> {
    return this.verifyMagicLinkOtpUseCase.execute(dto);
  }
}
