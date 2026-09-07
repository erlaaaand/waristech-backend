import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RegisterAhliWarisDto } from '../dto/register-ahli-waris.dto';
import { CreateUserUseCase } from '../../../users/applications/use-cases/create-user.use-case';
import { CreateUserDto } from '../../../users/applications/dto/create-user.dto';
import { UserRole } from '../../../users/domains/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../../users/domains/repositories/user.repository.interface';
import { MailService } from '../../../../shared/mail/mail.service';
import { OtpService } from '../../domains/services/otp.service';
import { ValidateInvitationUseCase } from '../../../../inheritance/applications/use-cases/validate-invitation.use-case';
import { RelationshipType } from '../../../../inheritance/domains/enums/family-member.enum';
import { InheritanceRegistrationService } from '../../../../inheritance/domains/services/inheritance-registration.service';
import {
  INVITATION_REPOSITORY_TOKEN,
  type IInvitationRepository,
} from '../../../../inheritance/domains/repositories/invitation.repository.interface';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../../../../shared/config/privacy-policy.constant';

@Injectable()
export class RegisterAhliWarisUseCase {
  private readonly logger = new Logger(RegisterAhliWarisUseCase.name);

  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
    private readonly validateInvitationUseCase: ValidateInvitationUseCase,
    private readonly inheritanceRegistrationService: InheritanceRegistrationService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
  ) {}

  async execute(
    dto: RegisterAhliWarisDto,
  ): Promise<{ message: string; userId: string }> {
    // 1. Validasi awal (feedback cepat jika kode jelas salah/kedaluwarsa)
    const {
      pewarisId,
      relationshipType,
      relationshipDescription,
      supportingDocumentUrl,
    } = await this.validateInvitationUseCase.execute(dto.invitationCode);

    // 2. Klaim kode undangan SEKARANG secara atomik — SEBELUM akun dibuat.
    // Ini gerbang tunggal yang mencegah kode yang sama dipakai dua kali
    // secara bersamaan (dua tab/klik ganda tidak lagi bisa menghasilkan
    // dua akun ahli waris dari satu undangan).
    await this.invitationRepo.claimPending(dto.invitationCode);

    try {
      // 3. Generate 6 digit OTP & set kedaluwarsa 10 menit
      const otpCode = this.otpService.generateOtpCode();
      const otpExpiresAt = this.otpService.calculateExpiration(10);

      // 4. Mapping data dengan penetapan ketat UserRole.AHLI_WARIS
      const createDto: CreateUserDto = {
        email: dto.email,
        password: dto.password,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        role: UserRole.AHLI_WARIS,
        otpCode,
        otpExpiresAt,
        isEmailVerified: false,
        isActive: false,
        // Persetujuan UU PDP sudah divalidasi wajib `true` di level DTO.
        consentGivenAt: new Date(),
        consentVersion: CURRENT_PRIVACY_POLICY_VERSION,
      };

      // 5. Insert user ke database
      const user =
        await this.createUserUseCase.executeAndReturnEntity(createDto);

      // 6. Catat penukaran kode + buat relasi FamilyMember
      await this.inheritanceRegistrationService.completeAhliWarisRegistration({
        invitationCode: dto.invitationCode,
        ahliWarisId: user.id,
        pewarisId,
        familyMemberId: randomUUID(),
        relationshipType: relationshipType as RelationshipType,
        relationshipDescription: relationshipDescription,
        supportingDocumentUrl: supportingDocumentUrl,
      });

      // 7. Kirim OTP via Email — akun & relasi keluarga SUDAH tersimpan di
      // titik ini (klaim undangan sudah final, tidak boleh dilepas lagi).
      // Kegagalan kirim email TIDAK membatalkan registrasi — arahkan ke
      // resend-otp alih-alih melempar 500 yang membuat pengguna mentok.
      let otpDelivered = true;
      try {
        await this.mailService.sendOtpEmail(
          user.email,
          user.fullName ?? 'Ahli Waris',
          otpCode,
        );
      } catch (mailError: unknown) {
        otpDelivered = false;
        this.logger.error(
          `Gagal mengirim OTP registrasi ke ${user.email}. Akun tetap dibuat — pengguna perlu memakai /auth/resend-otp.`,
          mailError instanceof Error ? mailError.stack : String(mailError),
        );
      }

      // 8. Kembalikan response sukses
      return {
        message: otpDelivered
          ? 'Registrasi Ahli Waris berhasil. Silakan cek email Anda untuk kode verifikasi.'
          : 'Registrasi Ahli Waris berhasil, namun pengiriman email OTP gagal. Silakan gunakan fitur "Kirim Ulang OTP".',
        userId: user.id,
      };
    } catch (error: unknown) {
      // Best-effort: lepas klaim supaya kode undangan tidak "hangus" sia-sia
      // bila langkah setelah klaim gagal (mis. akun sudah sempat dibuat tapi
      // gagal di langkah lain). Kegagalan pelepasan klaim tidak menutupi
      // error aslinya.
      await this.invitationRepo
        .releaseClaim(dto.invitationCode)
        .catch((releaseError: unknown) => {
          this.logger.error(
            `Gagal melepas klaim undangan ${dto.invitationCode} setelah registrasi gagal.`,
            releaseError instanceof Error
              ? releaseError.stack
              : String(releaseError),
          );
        });
      throw error;
    }
  }
}
