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
import { AssetStatus } from '../../domains/enums/asset.enum';

@Injectable()
export class AcknowledgeDistributionUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
  ) {}

  async execute(
    assetId: string,
    ahliWarisId: string,
  ): Promise<{ message: string }> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    if (asset.status !== AssetStatus.DISTRIBUTED) {
      throw new BadRequestException(
        'Konfirmasi hanya bisa dilakukan saat status aset DISTRIBUTED. Status saat ini: ' +
          asset.status,
      );
    }

    // Verify user is a non-executor beneficiary
    const allocations = await this.assetRepo.findAllocationsByAssetId(assetId);
    const userAllocation = allocations.find(
      (a) => a.ahliWarisId === ahliWarisId && !a.isExecutor,
    );

    if (!userAllocation) {
      throw new ForbiddenException(
        'Hanya Ahli Waris non-Eksekutor yang dapat mengkonfirmasi penerimaan dana.',
      );
    }

    if (userAllocation.acknowledgedAt) {
      throw new BadRequestException(
        'Anda sudah mengkonfirmasi penerimaan dana sebelumnya.',
      );
    }

    await this.assetRepo.acknowledgeAllocation(userAllocation.id);

    return {
      message: `Konfirmasi penerimaan dana untuk aset "${asset.assetName}" berhasil dicatat.`,
    };
  }
}
