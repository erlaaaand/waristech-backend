import { Inject, Injectable } from '@nestjs/common';
import { UpdateAssetDto } from '../dto/update-asset.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  ENCRYPTION_SERVICE_TOKEN,
  type IEncryptionService,
} from '../../domains/services/encryption.service.interface';
import {
  AssetNotFoundException,
  AssetNotOwnedException,
  AssetAlreadyVerifiedException,
} from '../../domains/exceptions/asset.exception';
import { AssetDomain } from '../../domains/entities/asset.entity';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';

@Injectable()
export class UpdateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(ENCRYPTION_SERVICE_TOKEN)
    private readonly encryptionService: IEncryptionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    id: string,
    pewarisId: string,
    dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    const asset = await this.assetRepo.findById(id);

    if (!asset) throw new AssetNotFoundException();
    if (!asset.isOwnedBy(pewarisId)) throw new AssetNotOwnedException();
    if (asset.isVerified()) {
      throw new AssetAlreadyVerifiedException();
    }

    let encryptedSecret: string | undefined;
    if (dto.secret) {
      const secretJson = JSON.stringify(dto.secret);
      encryptedSecret = await this.encryptionService.encrypt(secretJson);
      asset.updateSecret(encryptedSecret); // apply business rule check just in case
    }

    const updated = await this.assetRepo.update(id, {
      type: dto.type,
      assetName: dto.assetName,
      platform: dto.platform,
      accountIdentifier: dto.accountIdentifier,
      encryptedSecret,
    });

    this.auditLogService.logAsync({
      action: AuditAction.ASSET_UPDATED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId: pewarisId },
      resource: 'assets',
      resourceId: id,
      description: `Pewaris (${pewarisId}) memperbarui aset digital "${updated.assetName}".`,
      beforeState: { type: asset.type, assetName: asset.assetName },
      afterState: { type: updated.type, assetName: updated.assetName },
    });

    return this.toResponseDto(updated);
  }

  private toResponseDto(asset: AssetDomain): AssetResponseDto {
    return {
      id: asset.id,
      pewarisId: asset.pewarisId,
      type: asset.type,
      assetName: asset.assetName,
      platform: asset.platform,
      accountIdentifier: asset.accountIdentifier,
      status: asset.status,
      verifiedByNotarisId: asset.verifiedByNotarisId,
      verifiedAt: asset.verifiedAt,
      allocations: asset.allocations.map((a) => ({
        id: a.id,
        assetId: a.assetId,
        ahliWarisId: a.ahliWarisId,
        percentage: a.percentage,
        isExecutor: a.isExecutor,
        acknowledgedAt: a.acknowledgedAt,
        createdAt: a.createdAt,
      })),
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
