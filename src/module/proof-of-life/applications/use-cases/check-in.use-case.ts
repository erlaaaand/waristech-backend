import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../../identity/users/domains/repositories/user.repository.interface';

@Injectable()
export class CheckInUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string): Promise<{ message: string }> {
    // Check-in baru juga membatalkan eskalasi Proof-of-Life yang mungkin sudah berjalan —
    // Pewaris kembali aktif, proses verifikasi otomatis tidak relevan lagi.
    await this.userRepo.update(userId, {
      lastCheckInAt: new Date(),
      proofOfLifeEscalatedAt: null,
    });

    return { message: 'Check-in berhasil. Status Anda tercatat aktif.' };
  }
}
