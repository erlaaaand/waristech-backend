import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createPublicKey } from 'crypto';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../../domains/repositories/user.repository.interface';
import { RegisterPublicKeyDto } from '../dto/register-public-key.dto';

@Injectable()
export class RegisterPublicKeyUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    notarisId: string,
    dto: RegisterPublicKeyDto,
  ): Promise<{ message: string }> {
    // Validasi bahwa yang dikirim benar-benar public key yang bisa dipakai —
    // sekaligus menolak bila ada yang tidak sengaja mengirim private key.
    try {
      const key = createPublicKey(dto.publicKey);
      if (key.type !== 'public') {
        throw new Error('Bukan public key.');
      }
    } catch {
      throw new BadRequestException(
        'Public key tidak valid. Kirim public key format PEM (SPKI). Jangan pernah mengirim private key.',
      );
    }

    await this.userRepo.update(notarisId, { publicKey: dto.publicKey });

    return {
      message:
        'Public key berhasil didaftarkan. Bagian kunci aset kini dapat dienkripsi khusus untuk Anda.',
    };
  }
}
