import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../domains/repositories/user.repository.interface';
import { UserRole } from '../../domains/entities/user.entity';

@Injectable()
export class GetNotarisPublicKeyUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    notarisId: string,
  ): Promise<{ notarisId: string; fullName: string; publicKey: string }> {
    const notaris = await this.userRepo.findById(notarisId);

    if (!notaris || notaris.role !== UserRole.NOTARIS) {
      throw new NotFoundException('Notaris tidak ditemukan.');
    }

    if (!notaris.publicKey) {
      throw new NotFoundException(
        'Notaris ini belum mendaftarkan public key, sehingga bagian kunci belum dapat dititipkan kepadanya.',
      );
    }

    return {
      notarisId: notaris.id,
      fullName: notaris.fullName,
      publicKey: notaris.publicKey,
    };
  }
}
