import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
  type IAssetRepository,
  ASSET_REPOSITORY_TOKEN,
} from '../../domains/repositories/asset.repository.interface';
import {
  type IEncryptionService,
  ENCRYPTION_SERVICE_TOKEN,
} from '../../domains/services/encryption.service.interface';
import { AssetStatus } from '../../domains/enums/asset.enum';

/**
 * Struktur JSON terstruktur yang dikembalikan kepada Eksekutor.
 */
export interface VaultSecretPayload {
  username?: string;
  password?: string;
  pin?: string;
  notes?: string;
}

export interface UnlockAssetResponse {
  assetId: string;
  assetName: string;
  platform: string;
  accountIdentifier: string;
  secret: VaultSecretPayload | null;
  role: 'EXECUTOR' | 'BENEFICIARY';
  percentageOwned: number;
}

@Injectable()
export class UnlockAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(ENCRYPTION_SERVICE_TOKEN)
    private readonly encryptionService: IEncryptionService,
  ) {}

  async execute(assetId: string, userId: string): Promise<UnlockAssetResponse> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    // Brankas hanya bisa dibuka jika UNLOCKED atau sedang LIQUIDATING
    if (
      asset.status !== AssetStatus.UNLOCKED &&
      asset.status !== AssetStatus.LIQUIDATING
    ) {
      throw new BadRequestException(
        'Brankas aset belum terbuka. Status saat ini: ' + asset.status,
      );
    }

    // Verify authorization
    const allocations = await this.assetRepo.findAllocationsByAssetId(assetId);
    const userAllocation = allocations.find((a) => a.ahliWarisId === userId);

    if (!userAllocation) {
      throw new ForbiddenException('Anda tidak memiliki hak atas aset ini');
    }

    // ONLY the Executor gets the decrypted secret
    if (userAllocation.isExecutor) {
      const decryptedJson = await this.encryptionService.decrypt(
        asset.getEncryptedSecret(),
      );
      const secret = JSON.parse(decryptedJson) as VaultSecretPayload;
      return {
        assetId: asset.id,
        assetName: asset.assetName,
        platform: asset.platform,
        accountIdentifier: asset.accountIdentifier,
        secret,
        role: 'EXECUTOR',
        percentageOwned: userAllocation.percentage,
      };
    }

    // Non-executor beneficiaries: see asset info but NOT the secret
    return {
      assetId: asset.id,
      assetName: asset.assetName,
      platform: asset.platform,
      accountIdentifier: asset.accountIdentifier,
      secret: null,
      role: 'BENEFICIARY',
      percentageOwned: userAllocation.percentage,
    };
  }
}
