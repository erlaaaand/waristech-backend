import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RegisterAhliWarisDto } from '../dto/register-ahli-waris.dto';
import { CreateUserUseCase } from '../../../users/applications/use-cases/create-user.use-case';
import { CreateUserDto } from '../../../users/applications/dto/create-user.dto';
import { UserRole } from '../../../users/domains/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../../users/infrastructures/repositories/user.repository.interface';
import { MailService } from '../../../../shared/mail/mail.service';
import { OtpService } from '../../domains/services/otp.service';
import { ValidateInvitationUseCase } from '../../../../inheritance/applications/use-cases/validate-invitation.use-case';
import { RelationshipType } from '../../../../inheritance/domains/enums/family-member.enum';
import { InheritanceRegistrationService } from '../../../../inheritance/domains/services/inheritance-registration.service';

@Injectable()
export class RegisterAhliWarisUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
    private readonly validateInvitationUseCase: ValidateInvitationUseCase,
    private readonly inheritanceRegistrationService: InheritanceRegistrationService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    dto: RegisterAhliWarisDto,
  ): Promise<{ message: string; userId: string }> {
    // 1. Validasi Kode Undangan (Real Database Check)
    const { pewarisId } = await this.validateInvitationUseCase.execute(
      dto.invitationCode,
    );

    // 2. Generate 6 digit OTP & set kedaluwarsa 10 menit
    const otpCode = this.otpService.generateOtpCode();
    const otpExpiresAt = this.otpService.calculateExpiration(10);

    // 3. Mapping data dengan penetapan ketat UserRole.AHLI_WARIS
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
    };

    // 4. Insert user ke database
    const user = await this.createUserUseCase.executeAndReturnEntity(createDto);

    // 5. Delegasikan efek samping ke InheritanceRegistrationService
    await this.inheritanceRegistrationService.completeAhliWarisRegistration({
      invitationCode: dto.invitationCode,
      ahliWarisId: user.id,
      pewarisId,
      familyMemberId: randomUUID(),
      relationshipType: RelationshipType.NASAB,
      relationshipDescription:
        'Hubungan keluarga (menunggu konfirmasi Pewaris)',
    });

    // 6. Kirim OTP via Email
    await this.mailService.sendOtpEmail(
      user.email,
      user.fullName ?? 'Ahli Waris',
      otpCode,
    );

    // 7. Kembalikan response sukses
    return {
      message:
        'Registrasi Ahli Waris berhasil. Silakan cek email Anda untuk kode verifikasi.',
      userId: user.id,
    };
  }
}
