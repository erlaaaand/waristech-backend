import { Inject, Injectable, Logger } from '@nestjs/common';
import { RegisterPewarisDto } from '../dto/register-pewaris.dto';
import { CreateUserUseCase } from '../../../users/applications/use-cases/create-user.use-case';
import { CreateUserDto } from '../../../users/applications/dto/create-user.dto';
import { UserRole } from '../../../users/domains/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../../users/domains/repositories/user.repository.interface';
import { MailService } from '../../../../shared/mail/mail.service';
import { OtpService } from '../../domains/services/otp.service';
import { VerifyNikUseCase } from '../../../ekyc/applications/use-cases/verify-nik.use-case';
import { EkycValidationException } from '../../../ekyc/domains/exceptions/ekyc.exception';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../../../../shared/config/privacy-policy.constant';

@Injectable()
export class RegisterPewarisUseCase {
  private readonly logger = new Logger(RegisterPewarisUseCase.name);

  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
    private readonly verifyNikUseCase: VerifyNikUseCase,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    dto: RegisterPewarisDto,
  ): Promise<{ message: string; userId: string }> {
    // 1. Validasi NIK via e-KYC Sandbox (Dukcapil Algoritmik)
    const ekycResult = await this.verifyNikUseCase.execute(dto.nik);

    if (!ekycResult.isValid) {
      throw new EkycValidationException(ekycResult.message);
    }

    // 2. Generate 6 digit OTP & set kedaluwarsa 10 menit
    const otpCode = this.otpService.generateOtpCode();
    const otpExpiresAt = this.otpService.calculateExpiration(10);

    // 3. Mapping data dengan penetapan ketat UserRole.PEWARIS dan NIK
    const createDto: CreateUserDto = {
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      nik: dto.nik,
      role: UserRole.PEWARIS,
      otpCode,
      otpExpiresAt,
      isEmailVerified: false,
      isActive: false,
      // Persetujuan UU PDP sudah divalidasi wajib `true` di level DTO.
      consentGivenAt: new Date(),
      consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
    };

    // 4. Insert user ke database
    const user = await this.createUserUseCase.executeAndReturnEntity(createDto);

    // 5. Kirim OTP via Email — akun SUDAH tersimpan di titik ini. Bila
    // pengiriman gagal (SMTP down/timeout), jangan lempar 500 yang membuat
    // pengguna mentok (retry registrasi ulang akan kena 409 "email sudah
    // terdaftar"). Akun tetap dianggap berhasil dibuat; arahkan ke resend-otp.
    let otpDelivered = true;
    try {
      await this.mailService.sendOtpEmail(
        user.email,
        user.fullName ?? 'Pewaris',
        otpCode,
      );
    } catch (error: unknown) {
      otpDelivered = false;
      this.logger.error(
        `Gagal mengirim OTP registrasi ke ${user.email}. Akun tetap dibuat — pengguna perlu memakai /auth/resend-otp.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    // 6. Kembalikan response sukses
    return {
      message: otpDelivered
        ? 'Registrasi Pewaris berhasil. Silakan cek email Anda untuk kode verifikasi.'
        : 'Registrasi Pewaris berhasil, namun pengiriman email OTP gagal. Silakan gunakan fitur "Kirim Ulang OTP".',
      userId: user.id,
    };
  }
}
