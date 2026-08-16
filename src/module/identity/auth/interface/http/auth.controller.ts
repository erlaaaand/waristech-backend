// src/auth/interface/http/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthOrchestrator } from '../../applications/orchestrator/auth.orchestrator';
import { LoginDto } from '../../applications/dto/login.dto';
import { RegisterDto } from '../../applications/dto/register.dto';
import { AuthResponseDto } from '../../applications/dto/auth-response.dto';
import { VerifyEmailDto } from '../../applications/dto/verify-email.dto';
import { ForgotPasswordDto } from '../../applications/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../applications/dto/reset-password.dto';
import { ResendOtpDto } from '../../applications/dto/resend-otp.dto';
import { AuthExceptionFilter } from '../filters/auth-exception.filter';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../../domains/entities/jwt-payload.entity';
import { Audit } from '../../../../shared/audit/decorators/audit.decorator';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../../shared/audit/domains/enums/audit.enum';

@ApiTags('Auth')
@ApiBearerAuth('JWT')
@Controller('auth')
@UseFilters(AuthExceptionFilter)
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly orchestrator: AuthOrchestrator) {}

  // ── Register ───────────────────────────────────────────────────────────────

  @Public()
  @Audit({
    action: AuditAction.AUTH_REGISTER,
    category: AuditCategory.AUTH,
    resource: 'User',
    severity: AuditSeverity.INFO,
    description: 'Pendaftaran akun pengguna baru',
  })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Daftar akun baru',
    description:
      'Membuat akun pengguna baru. JWT token langsung dikembalikan ' +
      'sehingga user bisa langsung mengakses endpoint lain.\n\n' +
      '**Tidak memerlukan autentikasi.**\n\n' +
      '**Rate limit**: 5 request/menit per IP.',
    operationId: 'authRegister',
  })
  @ApiCreatedResponse({
    type: AuthResponseDto,
    description:
      'Registrasi berhasil. Gunakan `accessToken` di header `Authorization: Bearer <token>`.',
  })
  @ApiBadRequestResponse({
    description:
      'Validasi gagal — email format salah, password terlalu lemah, dll.',
    schema: {
      example: {
        statusCode: 400,
        message: ['Format email tidak valid', 'Password minimal 8 karakter'],
        error: 'BadRequestException',
        module: 'auth',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email sudah terdaftar.',
    schema: {
      example: {
        statusCode: 409,
        message: "Email 'x@y.com' sudah digunakan",
        error: 'ConflictException',
        module: 'auth',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.',
  })
  register(
    @Body() dto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    return this.orchestrator.register(dto);
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  @Public()
  @Audit({
    action: AuditAction.AUTH_LOGIN,
    category: AuditCategory.AUTH,
    resource: 'User',
    severity: AuditSeverity.INFO,
    description: 'User login attempt',
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Login',
    description:
      'Login dengan email dan password. Mengembalikan JWT access token.\n\n' +
      '**Tidak memerlukan autentikasi.**\n\n' +
      '**Rate limit**: 5 request/menit per IP.\n\n' +
      '**Security**: Menggunakan constant-time comparison untuk mencegah timing attack.\n\n' +
      'Simpan `accessToken` dan gunakan di setiap request berikutnya:\n' +
      '```\nAuthorization: Bearer <accessToken>\n```',
    operationId: 'authLogin',
  })
  @ApiOkResponse({
    type: AuthResponseDto,
    description:
      'Login berhasil. Simpan `accessToken` untuk digunakan di request selanjutnya.',
  })
  @ApiUnauthorizedResponse({
    description: 'Email atau password salah.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Email atau password tidak valid',
        error: 'UnauthorizedException',
        module: 'auth',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response, // <-- Tambahkan decorator Res
  ) {
    const result = await this.orchestrator.login(dto);

    // Set HttpOnly Cookie
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      domain:
        process.env.NODE_ENV === 'production'
          ? process.env.COOKIE_DOMAIN || undefined
          : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Hari
    });

    // Mengembalikan data user (tanpa mengekspos token di JSON body)
    return {
      message: 'Login berhasil',
      user: result.user,
    };
  }

  // ── Me ─────────────────────────────────────────────────────────────────────

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Info user yang sedang login',
    description: 'Mengembalikan data user berdasarkan JWT token yang aktif.',
    operationId: 'authMe',
  })
  @ApiOkResponse({
    description: 'Data user berhasil diambil.',
    schema: {
      example: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau expired.' })
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({
    summary: 'Logout pengguna',
    description:
      'Melakukan proses logout pengguna (misalnya invalidasi token aktif).',
    operationId: 'authLogout',
  })
  @ApiOkResponse({
    description: 'Logout berhasil',
    schema: {
      example: { message: 'Logout berhasil' },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
  })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. Eksekusi logika logout di orchestrator (misal invalidasi di DB)
    await this.orchestrator.logout(user.sub);

    // 2. Hapus cookie di browser klien
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite:
        process.env.NODE_ENV === 'production'
          ? ('none' as const)
          : ('lax' as const),
      path: '/',
      domain:
        process.env.NODE_ENV === 'production'
          ? process.env.COOKIE_DOMAIN || undefined
          : undefined,
      maxAge: 0, // maxAge 0 akan menghancurkan cookie
    };

    res.cookie('accessToken', '', cookieOptions);
    res.cookie('x-csrf-token', '', cookieOptions);

    return { message: 'Logout berhasil' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } }) // 🚨 FIX: Mengizinkan login massal dari sekolah
  @ApiOperation({
    summary: 'Verifikasi email pengguna',
    description:
      'Memverifikasi email pengguna menggunakan kode OTP yang dikirimkan ke email.\n\n' +
      '**Tidak memerlukan autentikasi.**',
    operationId: 'authVerifyEmail',
  })
  @ApiOkResponse({
    type: AuthResponseDto,
    description:
      'Verifikasi berhasil. Simpan `accessToken` untuk digunakan di request selanjutnya.',
  })
  @ApiBadRequestResponse({
    description:
      'Validasi gagal — email tidak ditemukan, kode OTP salah, atau kode OTP sudah kadaluarsa.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Kode OTP salah.',
        error: 'BadRequestException',
        module: 'auth',
      },
    },
  })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.orchestrator.verifyEmail(dto.email, dto.otp);

    // Set HttpOnly Cookie
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      domain:
        process.env.NODE_ENV === 'production'
          ? process.env.COOKIE_DOMAIN || undefined
          : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Hari
    });

    return {
      message: 'Verifikasi berhasil',
      user: result.user,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Kirim OTP Lupa Password',
    description: 'Mengirimkan kode OTP ke email pengguna untuk reset password.',
    operationId: 'authForgotPassword',
  })
  @ApiOkResponse({ description: 'OTP berhasil dikirim.' })
  @ApiBadRequestResponse({ description: 'Email tidak valid.' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.orchestrator.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Reset Password',
    description: 'Mereset password menggunakan OTP yang dikirim ke email.',
    operationId: 'authResetPassword',
  })
  @ApiOkResponse({ description: 'Password berhasil diubah.' })
  @ApiBadRequestResponse({
    description: 'OTP salah atau format password tidak valid.',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.orchestrator.resetPassword(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Resend OTP',
    description: 'Kirim ulang OTP pendaftaran.',
    operationId: 'authResendOtp',
  })
  @ApiOkResponse({ description: 'OTP berhasil dikirim ulang.' })
  @ApiBadRequestResponse({
    description: 'Email tidak ditemukan atau sudah diverifikasi.',
  })
  async resendOtp(@Body() dto: ResendOtpDto): Promise<{ message: string }> {
    return this.orchestrator.resendOtp(dto);
  }
}
