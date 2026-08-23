import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AllocateAssetDto } from '../dto/allocate-asset.dto';
import { AssetAllocationResponseDto } from '../dto/asset-response.dto';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  AssetNotFoundException,
  AssetNotOwnedException,
  AssetAlreadyVerifiedException,
} from '../../domains/exceptions/asset.exception';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';

@Injectable()
export class AllocateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    pewarisId: string,
    assetId: string,
    dto: AllocateAssetDto,
  ): Promise<AssetAllocationResponseDto> {
    const asset = await this.assetRepo.findById(assetId);

    if (!asset) throw new AssetNotFoundException();
    if (!asset.isOwnedBy(pewarisId)) throw new AssetNotOwnedException();
    if (asset.isVerified()) {
      throw new AssetAlreadyVerifiedException(
        'Aset yang sudah diverifikasi tidak dapat diubah alokasinya.',
      );
    }

    // Validate allocation aggregate
    asset.validateNewAllocation(dto.percentage);

    // Validate executor uniqueness: Only 1 executor per asset
    const isExecutor = dto.isExecutor ?? false;
    if (isExecutor) {
      const existingAllocations =
        await this.assetRepo.findAllocationsByAssetId(assetId);
      const hasExecutor = existingAllocations.some((a) => a.isExecutor);
      if (hasExecutor) {
        throw new AssetAlreadyVerifiedException(
          'Aset ini sudah memiliki Eksekutor. Hapus penunjukan sebelumnya terlebih dahulu.',
        );
      }
    }

    const allocation = await this.assetRepo.upsertAllocation({
      id: randomUUID(),
      assetId,
      ahliWarisId: dto.ahliWarisId,
      percentage: dto.percentage,
      isExecutor,
    });

    this.auditLogService.logAsync({
      action: AuditAction.ASSET_UPDATED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId: pewarisId },
      resource: 'asset_allocations',
      resourceId: allocation.id,
      description: `Pewaris (${pewarisId}) mengalokasikan ${dto.percentage}% aset "${asset.assetName}" ke ahli waris (${dto.ahliWarisId}).${isExecutor ? ' [DITUNJUK SEBAGAI EKSEKUTOR]' : ''}`,
    });

    return {
      id: allocation.id,
      assetId: allocation.assetId,
      ahliWarisId: allocation.ahliWarisId,
      percentage: allocation.percentage,
      isExecutor: allocation.isExecutor,
      acknowledgedAt: allocation.acknowledgedAt,
      createdAt: allocation.createdAt,
    };
  }
}
