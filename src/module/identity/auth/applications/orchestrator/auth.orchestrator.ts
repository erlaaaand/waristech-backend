// src/auth/applications/orchestrator/auth.orchestrator.ts
import { Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { VerificationResponseDto } from '../dto/verification-response.dto';
import { LoginUseCase } from '../use-cases/login.use-case';
import { RegisterUseCase } from '../use-cases/register.use-case';
import { LogoutService } from '../use-cases/logout.use-case';
import { VerifyEmailUseCase } from '../use-cases/verify-email.use-case';
import { ForgotPasswordUseCase } from '../use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ResendOtpUseCase } from '../use-cases/resend-otp.use-case';
import { ResendOtpDto } from '../dto/resend-otp.dto';

@Injectable()
export class AuthOrchestrator {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly logoutService: LogoutService,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly resendOtpUseCase: ResendOtpUseCase,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    return this.registerUseCase.execute(dto);
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
}
