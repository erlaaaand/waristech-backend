import { Inject, Injectable } from '@nestjs/common';
import { RegisterPewarisDto } from '../dto/register-pewaris.dto';
import { CreateUserUseCase } from '../../../users/applications/use-cases/create-user.use-case';
import { CreateUserDto } from '../../../users/applications/dto/create-user.dto';
import { UserRole } from '../../../users/domains/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../../users/infrastructures/repositories/user.repository.interface';
import { MailService } from '../../../../shared/mail/mail.service';
import { OtpService } from '../../domains/services/otp.service';
import { VerifyNikUseCase } from '../../../ekyc/applications/use-cases/verify-nik.use-case';
import { EkycValidationException } from '../../../ekyc/domains/exceptions/ekyc.exception';

@Injectable()
export class RegisterPewarisUseCase {
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
    };

    // 4. Insert user ke database
    const user = await this.createUserUseCase.executeAndReturnEntity(createDto);

    // 5. Kirim OTP via Email
    await this.mailService.sendOtpEmail(
      user.email,
      user.fullName ?? 'Pewaris',
      otpCode,
    );

    // 6. Kembalikan response sukses
    return {
      message:
        'Registrasi Pewaris berhasil. Silakan cek email Anda untuk kode verifikasi.',
      userId: user.id,
    };
  }
}
