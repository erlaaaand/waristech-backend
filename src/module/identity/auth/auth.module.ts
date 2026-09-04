// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

// External Modules
import { UserModule } from '../users/user.module';
import { EkycModule } from '../ekyc/ekyc.module';
import { InheritanceModule } from '../../inheritance/inheritance.module';

// Strategy
import { JwtStrategy } from './infrastructures/strategies/jwt.strategy';
import { TokenService } from './infrastructures/services/token.service';

// Domain
import { TOKEN_SERVICE_TOKEN } from './domains/services/token.service.interface';
import { AuthValidator } from './domains/validators/auth.validator';
import { AuthMapper } from './domains/mappers/auth.mapper';
import { OtpService } from './domains/services/otp.service';

// Use Cases
import { LoginUseCase } from './applications/use-cases/login.use-case';

import { RegisterPewarisUseCase } from './applications/use-cases/register-pewaris.use-case';
import { RegisterAhliWarisUseCase } from './applications/use-cases/register-ahli-waris.use-case';
import { LogoutService } from './applications/use-cases/logout.use-case';
import { VerifyEmailUseCase } from './applications/use-cases/verify-email.use-case';
import { ForgotPasswordUseCase } from './applications/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './applications/use-cases/reset-password.use-case';
import { ResendOtpUseCase } from './applications/use-cases/resend-otp.use-case';
import { GenerateMagicLinkUseCase } from './applications/use-cases/generate-magic-link.use-case';
import { VerifyMagicLinkOtpUseCase } from './applications/use-cases/verify-magic-link-otp.use-case';

// Orchestrator
import { AuthOrchestrator } from './applications/orchestrator/auth.orchestrator';

// Controller
import { AuthController } from './interface/http/auth.controller';

// Guard
import { JwtAuthGuard } from './interface/guards/jwt-auth.guard';

// Events & Listeners
import { UserLoggedInListener } from './infrastructures/listeners/user-logged-in.listener';

@Module({
  imports: [
    UserModule,
    EkycModule,
    InheritanceModule,

    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as StringValue,
          issuer: config.getOrThrow<string>('JWT_ISSUER'),
          audience: config.getOrThrow<string>('JWT_AUDIENCE'),
        },
        verifyOptions: {
          issuer: config.getOrThrow<string>('JWT_ISSUER'),
          audience: config.getOrThrow<string>('JWT_AUDIENCE'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: TOKEN_SERVICE_TOKEN,
      useClass: TokenService,
    },
    OtpService,
    AuthValidator,
    AuthMapper,
    LoginUseCase,

    RegisterPewarisUseCase,
    RegisterAhliWarisUseCase,
    AuthOrchestrator,
    JwtAuthGuard,
    UserLoggedInListener,
    LogoutService,
    VerifyEmailUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ResendOtpUseCase,
    GenerateMagicLinkUseCase,
    VerifyMagicLinkOtpUseCase,
  ],
  exports: [
    JwtAuthGuard,
    JwtModule,
    TOKEN_SERVICE_TOKEN,
    GenerateMagicLinkUseCase,
  ],
})
export class AuthModule {}
