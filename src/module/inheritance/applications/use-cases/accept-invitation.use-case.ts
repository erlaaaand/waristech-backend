import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  INVITATION_REPOSITORY_TOKEN,
  type IInvitationRepository,
} from '../../domains/repositories/invitation.repository.interface';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import { RelationshipType } from '../../domains/entities/family-member.entity';
import { AlreadyFamilyMemberException } from '../../domains/exceptions/inheritance.exception';
import { ValidateInvitationUseCase } from './validate-invitation.use-case';
import { InheritanceRegistrationService } from '../../domains/services/inheritance-registration.service';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';
import { MyFamilyMembershipResponseDto } from '../dto/inheritance-response.dto';

/**
 * Terima undangan pakai akun Ahli Waris yang SUDAH ADA (sudah login) —
 * melengkapi satu-satunya jalur redeem sebelumnya (RegisterAhliWarisUseCase),
 * yang SELALU mencoba membuat akun baru sehingga gagal (email sudah
 * terdaftar) kalau Ahli Waris yang sama ingin terhubung ke Pewaris kedua
 * (mis. undangan dari Ibu setelah sebelumnya menerima undangan dari Ayah).
 * Tabel `family_members` sendiri sudah Many-to-Many murni (tidak ada unique
 * constraint pewarisId+ahliWarisId) — yang belum ada hanya jalur redeem-nya.
 */
@Injectable()
export class AcceptInvitationUseCase {
  private readonly logger = new Logger(AcceptInvitationUseCase.name);

  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepo: IInvitationRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly validateInvitationUseCase: ValidateInvitationUseCase,
    private readonly inheritanceRegistrationService: InheritanceRegistrationService,
  ) {}

  async execute(
    code: string,
    ahliWarisId: string,
  ): Promise<MyFamilyMembershipResponseDto> {
    // 1. Validasi kode (sama seperti dipakai jalur registrasi).
    const {
      pewarisId,
      relationshipType,
      relationshipDescription,
      supportingDocumentUrl,
    } = await this.validateInvitationUseCase.execute(code);

    // 2. Cegah relasi duplikat — mis. Ahli Waris tidak sengaja menukarkan
    // dua kode undangan berbeda dari Pewaris yang sama.
    const existingMemberships =
      await this.familyMemberRepo.findByAhliWarisId(ahliWarisId);
    if (existingMemberships.some((m) => m.pewarisId === pewarisId)) {
      throw new AlreadyFamilyMemberException();
    }

    // 3. Klaim kode secara atomik SEBELUM menyisipkan relasi — gerbang yang
    // sama dipakai RegisterAhliWarisUseCase, mencegah kode dipakai dua kali
    // secara bersamaan.
    await this.invitationRepo.claimPending(code);

    const familyMemberId = randomUUID();
    try {
      // 4. Lewati pembuatan akun — langsung sisipkan relasi FamilyMember
      // yang menghubungkan pewarisId (pemilik undangan) dengan ahliWarisId
      // (dari sesi JWT user yang sedang login).
      await this.inheritanceRegistrationService.completeAhliWarisRegistration({
        invitationCode: code,
        ahliWarisId,
        pewarisId,
        familyMemberId,
        relationshipType: relationshipType as RelationshipType,
        relationshipDescription,
        supportingDocumentUrl,
      });
    } catch (error: unknown) {
      // Best-effort: lepas klaim supaya kode tidak "hangus" sia-sia bila
      // penyisipan relasi gagal setelah klaim berhasil.
      await this.invitationRepo
        .releaseClaim(code)
        .catch((releaseError: unknown) => {
          this.logger.error(
            `Gagal melepas klaim undangan ${code} setelah accept-invitation gagal.`,
            releaseError instanceof Error
              ? releaseError.stack
              : String(releaseError),
          );
        });
      throw error;
    }

    const [created, pewaris] = await Promise.all([
      this.familyMemberRepo.findById(familyMemberId),
      this.userRepo.findById(pewarisId),
    ]);
    // created tidak pernah null di sini — baris ini baru saja disisipkan
    // oleh completeAhliWarisRegistration() di atas tanpa error.
    const member = created!;

    return {
      id: member.id,
      pewarisId: member.pewarisId,
      pewarisName: pewaris?.fullName ?? null,
      ahliWarisId: member.ahliWarisId,
      ahliWarisName: null,
      relationshipType: member.relationshipType,
      relationshipDescription: member.relationshipDescription,
      status: member.status,
      supportingDocumentUrl: member.supportingDocumentUrl,
      verifiedByNotarisId: member.verifiedByNotarisId,
      verifiedAt: member.verifiedAt,
      createdAt: member.createdAt,
    };
  }
}
