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
  ApiUnprocessableEntityResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthOrchestrator } from '../../applications/orchestrator/auth.orchestrator';
import { LoginDto } from '../../applications/dto/login.dto';

import { RegisterPewarisDto } from '../../applications/dto/register-pewaris.dto';
import { RegisterAhliWarisDto } from '../../applications/dto/register-ahli-waris.dto';
import { AuthSessionResponseDto } from '../../applications/dto/auth-response.dto';
import { VerifyEmailDto } from '../../applications/dto/verify-email.dto';
import { ForgotPasswordDto } from '../../applications/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../applications/dto/reset-password.dto';
import { ResendOtpDto } from '../../applications/dto/resend-otp.dto';
import { GenerateMagicLinkDto } from '../../applications/dto/generate-magic-link.dto';
import { VerifyMagicLinkOtpDto } from '../../applications/dto/verify-magic-link-otp.dto';
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
  constructor(
    private readonly orchestrator: AuthOrchestrator,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(maxAge: number) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('COOKIE_DOMAIN');

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      domain: isProduction ? domain || undefined : undefined,
      maxAge,
    };
  }

  // ── Register Pewaris (Self-Service) ────────────────────────────────────────

  @Public()
  @Audit({
    action: AuditAction.AUTH_REGISTER,
    category: AuditCategory.AUTH,
    resource: 'User',
    severity: AuditSeverity.INFO,
    description: 'Pendaftaran akun Pewaris baru (Self-Service)',
  })
  @Post('register/pewaris')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Daftar akun Pewaris (Self-Service)',
    description:
      'Membuat akun Pewaris baru dengan menyertakan NIK 16 digit.\n\n' +
      'Sistem secara otomatis menetapkan peran sebagai `PEWARIS`.\n\n' +
      '**Tidak memerlukan autentikasi.**\n\n' +
      '### Ketentuan NIK\n' +
      'NIK divalidasi secara algoritmik oleh e-KYC (Dukcapil sandbox). Digit ke-7 s/d 12 ' +
      'wajib berupa tanggal lahir `DDMMYY` yang masuk akal — untuk perempuan, `DD` ditambah 40.\n\n' +
      'Contoh valid: `3171011508900001` → lahir 15-08-1990 (laki-laki).\n' +
      'NIK dengan tanggal mustahil ditolak **422 `NIK_VALIDATION_FAILED`**.\n\n' +
      '### Persetujuan data pribadi\n' +
      'Field `consentAgreed` **wajib bernilai `true`** (UU No. 27/2022 tentang ' +
      'Pelindungan Data Pribadi). Bila `false` atau tidak dikirim, request ditolak 400.\n\n' +
      '### Setelah registrasi\n' +
      'Akun dibuat dalam kondisi **non-aktif** dan OTP dikirim ke email. Login baru bisa ' +
      'dilakukan setelah `POST /auth/verify-email` berhasil.',
    operationId: 'authRegisterPewaris',
  })
  @ApiCreatedResponse({
    description:
      'Registrasi berhasil. Akun masih non-aktif — cek email untuk kode OTP verifikasi.',
  })
  @ApiBadRequestResponse({
    description:
      'Validasi gagal — format NIK/email salah, atau `consentAgreed` bukan `true`.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'NIK gagal validasi algoritmik e-KYC (tanggal lahir pada NIK tidak valid).',
    schema: {
      example: {
        statusCode: 422,
        message: 'Format tanggal lahir pada NIK tidak valid secara algoritmik.',
        error: 'NIK_VALIDATION_FAILED',
        module: 'auth',
      },
    },
  })
  @ApiConflictResponse({ description: 'Email atau NIK sudah terdaftar.' })
  registerPewaris(
    @Body() dto: RegisterPewarisDto,
  ): Promise<{ message: string; userId: string }> {
    return this.orchestrator.registerPewaris(dto);
  }

  // ── Register Ahli Waris (Closed-Loop / Invitation) ─────────────────────────

  @Public()
  @Audit({
    action: AuditAction.AUTH_REGISTER,
    category: AuditCategory.AUTH,
    resource: 'User',
    severity: AuditSeverity.INFO,
    description: 'Pendaftaran akun Ahli Waris berbasis undangan',
  })
  @Post('register/ahli-waris')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Daftar akun Ahli Waris (Berbasis Undangan)',
    description:
      'Membuat akun Ahli Waris baru dengan kode undangan (`invitationCode`).\n\n' +
      'Sistem memvalidasi kode undangan dan menetapkan peran sebagai `AHLI_WARIS`.\n\n' +
      '**Tidak memerlukan autentikasi.**',
    operationId: 'authRegisterAhliWaris',
  })
  @ApiCreatedResponse({
    description: 'Registrasi Ahli Waris berhasil. Silakan cek email untuk OTP.',
  })
  @ApiBadRequestResponse({
    description: 'Kode undangan tidak valid atau format data salah.',
  })
  @ApiConflictResponse({ description: 'Email sudah terdaftar.' })
  registerAhliWaris(
    @Body() dto: RegisterAhliWarisDto,
  ): Promise<{ message: string; userId: string }> {
    return this.orchestrator.registerAhliWaris(dto);
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
      'Login dengan email dan password.\n\n' +
      '**Tidak memerlukan autentikasi.**\n\n' +
      '**Rate limit**: 100 request/menit per IP.\n\n' +
      '**Security**: constant-time comparison untuk mencegah timing attack.\n\n' +
      '### Cara token dikirim\n' +
      'JWT **tidak** dikembalikan di body respons. Token diset sebagai cookie ' +
      '`accessToken` yang **HttpOnly** agar tidak bisa dibaca JavaScript (mitigasi XSS).\n\n' +
      '- **Web**: cukup kirim request berikutnya dengan `credentials: "include"`.\n' +
      '- **Mobile/HTTP client**: gunakan cookie jar (mis. `dio` + `cookie_jar` di Flutter, ' +
      'atau `curl -c/-b`). Alternatifnya, ambil nilai cookie dari header `Set-Cookie` ' +
      'lalu kirim sebagai `Authorization: Bearer <token>` — JWT strategy menerima keduanya.\n\n' +
      '**Akun wajib sudah terverifikasi email.** Akun yang belum verifikasi bersifat ' +
      'non-aktif dan login akan ditolak 401 `AccountDisabledError`.',
    operationId: 'authLogin',
  })
  @ApiOkResponse({
    type: AuthSessionResponseDto,
    description:
      'Login berhasil. JWT dikirim via cookie HttpOnly `accessToken`, bukan di body.',
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.orchestrator.login(dto);

    // Set HttpOnly Cookie
    res.cookie(
      'accessToken',
      result.accessToken,
      this.getCookieOptions(7 * 24 * 60 * 60 * 1000), // 7 Hari
    );

    // Mengembalikan data user dan accessToken untuk fallback cross-domain
    return {
      message: 'Login berhasil',
      user: result.user,
      accessToken: result.accessToken,
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
  @Audit({
    action: AuditAction.AUTH_LOGOUT,
    category: AuditCategory.AUTH,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'User logout',
  })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. Eksekusi logika logout di orchestrator (misal invalidasi di DB)
    await this.orchestrator.logout(user.sub);

    // 2. Hapus cookie di browser klien
    const cookieOptions = this.getCookieOptions(0); // maxAge 0 akan menghancurkan cookie

    res.cookie('accessToken', '', cookieOptions);
    res.cookie('x-csrf-token', '', cookieOptions);

    return { message: 'Logout berhasil' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verifikasi email pengguna',
    description:
      'Memverifikasi email pengguna menggunakan kode OTP yang dikirimkan ke email. ' +
      'Setelah berhasil, akun menjadi aktif dan sesi langsung dibuat.\n\n' +
      '**Tidak memerlukan autentikasi.**\n\n' +
      'Field OTP bernama `otp` (bukan `otpCode`).\n\n' +
      'Seperti login, JWT dikirim via cookie HttpOnly `accessToken` — tidak di body respons.',
    operationId: 'authVerifyEmail',
  })
  @ApiOkResponse({
    type: AuthSessionResponseDto,
    description:
      'Verifikasi berhasil, akun aktif. JWT dikirim via cookie HttpOnly `accessToken`.',
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
  @Audit({
    action: AuditAction.AUTH_VERIFY_EMAIL,
    category: AuditCategory.AUTH,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Verifikasi email menggunakan OTP',
  })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.orchestrator.verifyEmail(dto.email, dto.otp);

    // Set HttpOnly Cookie
    res.cookie(
      'accessToken',
      result.accessToken,
      this.getCookieOptions(7 * 24 * 60 * 60 * 1000), // 7 Hari
    );

    return {
      message: 'Verifikasi berhasil',
      user: result.user,
      accessToken: result.accessToken,
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
  @Audit({
    action: AuditAction.AUTH_PASSWORD_RESET_REQUEST,
    category: AuditCategory.AUTH,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Request OTP lupa password',
  })
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
  @Audit({
    action: AuditAction.AUTH_PASSWORD_RESET_SUCCESS,
    category: AuditCategory.AUTH,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Reset password menggunakan OTP',
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
  @Audit({
    action: AuditAction.AUTH_VERIFY_EMAIL,
    category: AuditCategory.AUTH,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Resend OTP verifikasi',
  })
  async resendOtp(@Body() dto: ResendOtpDto): Promise<{ message: string }> {
    return this.orchestrator.resendOtp(dto);
  }

  @Public()
  @Post('magic-link/generate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Generate Magic Link untuk Saksi/Kontak Darurat (Guest)',
    description: 'Menghasilkan URL berbatas waktu untuk proses validasi.',
    operationId: 'authGenerateMagicLink',
  })
  @ApiOkResponse({ description: 'Magic link berhasil digenerate.' })
  @Audit({
    action: AuditAction.AUTH_LOGIN,
    category: AuditCategory.AUTH,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Generate magic link untuk Guest',
  })
  async generateMagicLink(
    @Body() dto: GenerateMagicLinkDto,
  ): Promise<{ message: string }> {
    return this.orchestrator.generateMagicLink(dto);
  }

  @Public()
  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify Magic Link OTP (Guest Login)',
    description:
      'Login sementara untuk Guest (Saksi/Kontak Darurat) memakai token dari magic link ' +
      'DAN kode OTP yang dikirim ke email/SMS Saksi.\n\n' +
      'Token dan OTP bersifat **sekali pakai** — keduanya dihanguskan setelah login berhasil.\n\n' +
      'JWT dikirim via cookie HttpOnly `accessToken` (masa berlaku 1 hari untuk Guest), ' +
      'tidak di body respons.',
    operationId: 'authVerifyMagicLink',
  })
  @ApiOkResponse({
    type: AuthSessionResponseDto,
    description:
      'Verifikasi berhasil. Sesi Guest dibuat via cookie HttpOnly `accessToken`.',
  })
  @Audit({
    action: AuditAction.AUTH_LOGIN,
    category: AuditCategory.AUTH,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Guest login dengan magic link & OTP',
  })
  async verifyMagicLink(
    @Body() dto: VerifyMagicLinkOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.orchestrator.verifyMagicLinkOtp(dto);

    // Set HttpOnly Cookie for Guest
    res.cookie(
      'accessToken',
      result.accessToken,
      this.getCookieOptions(1 * 24 * 60 * 60 * 1000), // 1 Hari untuk Guest
    );

    return {
      message: 'Verifikasi Magic Link berhasil',
      user: result.user,
      accessToken: result.accessToken,
    };
  }
}
