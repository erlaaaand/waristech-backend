import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RegisterWitnessDto } from '../dto/register-witness.dto';
import { WitnessResponseDto } from '../dto/inheritance-response.dto';
import { IWitnessRepository } from '../../domains/repositories/witness.repository.interface';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';

/**
 * Mendaftarkan Saksi / Kontak Darurat milik Pewaris.
 *
 * Proposal mensyaratkan kontak darurat adalah pihak NON-AHLI WARIS
 * (mis. teman dekat/kolega) — tujuannya agar konfirmasi status Pewaris datang
 * dari pihak yang tidak punya kepentingan atas harta warisan, sekaligus
 * menghindari kepanikan prematur di lingkaran keluarga.
 */
@Injectable()
export class RegisterWitnessUseCase {
  constructor(
    private readonly witnessRepo: IWitnessRepository,
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    pewarisId: string,
    dto: RegisterWitnessDto,
  ): Promise<WitnessResponseDto> {
    await this.assertNotAnHeir(pewarisId, dto.email);
    await this.assertNotDuplicate(pewarisId, dto.email);

    const witness = await this.witnessRepo.create({
      id: randomUUID(),
      pewarisId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
    });

    return {
      id: witness.id,
      pewarisId: witness.pewarisId,
      name: witness.name,
      email: witness.email,
      phone: witness.phone,
      status: witness.status,
      createdAt: witness.createdAt,
    };
  }

  /** Tolak bila email yang didaftarkan ternyata milik ahli waris Pewaris ini. */
  private async assertNotAnHeir(
    pewarisId: string,
    email: string,
  ): Promise<void> {
    const candidate = await this.userRepo.findByEmail(email);
    if (!candidate) return; // Bukan pengguna terdaftar — pasti bukan ahli waris.

    if (candidate.id === pewarisId) {
      throw new ConflictException(
        'Anda tidak dapat mendaftarkan diri sendiri sebagai Saksi/Kontak Darurat.',
      );
    }

    const familyMembers =
      await this.familyMemberRepo.findByPewarisId(pewarisId);
    const isHeir = familyMembers.some((m) => m.ahliWarisId === candidate.id);

    if (isHeir) {
      throw new ConflictException(
        'Kontak darurat harus pihak NON-ahli waris (mis. teman dekat atau kolega). ' +
          'Email ini terdaftar sebagai ahli waris Anda, sehingga tidak dapat menjadi Saksi.',
      );
    }
  }

  private async assertNotDuplicate(
    pewarisId: string,
    email: string,
  ): Promise<void> {
    const existing = await this.witnessRepo.findByPewarisId(pewarisId);
    if (existing.some((w) => w.email.toLowerCase() === email.toLowerCase())) {
      throw new ConflictException(
        'Saksi dengan email ini sudah terdaftar untuk Anda.',
      );
    }
  }
}
