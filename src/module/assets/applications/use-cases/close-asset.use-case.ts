import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  type IAssetRepository,
  ASSET_REPOSITORY_TOKEN,
} from '../../domains/repositories/asset.repository.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';

/**
 * CloseAssetUseCase (Notaris Only)
 *
 * Menutup kasus warisan secara final dan melakukan Data Shredding:
 * encryptedSecret di-overwrite dengan random bytes, lalu di-null-kan.
 * Ini memenuhi UU Pelindungan Data Pribadi (UU PDP).
 */
@Injectable()
export class CloseAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
  ) {}

  async execute(
    assetId: string,
    notarisId: string,
  ): Promise<{ message: string }> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    // Hanya bisa ditutup dari status DISTRIBUTED atau DISPUTED_LIQUIDATION
    if (
      asset.status !== AssetStatus.DISTRIBUTED &&
      asset.status !== AssetStatus.DISPUTED_LIQUIDATION
    ) {
      throw new BadRequestException(
        'Kasus hanya bisa ditutup dari status DISTRIBUTED atau DISPUTED_LIQUIDATION. Status saat ini: ' +
          asset.status,
      );
    }

    // ── DATA SHREDDING (Cryptographic Wipe) ──────────────────────────────
    // Step 1: Overwrite encryptedSecret with random cryptographic bytes
    const randomWipe = randomBytes(64).toString('hex');
    await this.assetRepo.update(assetId, { encryptedSecret: randomWipe });

    // Step 2: Null out the field and set status to CLOSED
    await this.assetRepo.update(assetId, {
      encryptedSecret: '',
      status: AssetStatus.CLOSED,
    });

    return {
      message: `Kasus aset "${asset.assetName}" berhasil ditutup oleh Notaris (${notarisId}). Data rahasia telah dihancurkan secara permanen.`,
    };
  }
}
