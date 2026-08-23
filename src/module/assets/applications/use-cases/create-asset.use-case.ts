import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  ENCRYPTION_SERVICE_TOKEN,
  type IEncryptionService,
} from '../../domains/services/encryption.service.interface';
import { AssetDomain } from '../../domains/entities/asset.entity';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';

@Injectable()
export class CreateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(ENCRYPTION_SERVICE_TOKEN)
    private readonly encryptionService: IEncryptionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(
    pewarisId: string,
    dto: CreateAssetDto,
  ): Promise<AssetResponseDto> {
    const secretJson = JSON.stringify(dto.secret);
    const encryptedSecret = await this.encryptionService.encrypt(secretJson);

    const asset = await this.assetRepo.create({
      id: randomUUID(),
      pewarisId,
      type: dto.type,
      assetName: dto.assetName,
      platform: dto.platform,
      accountIdentifier: dto.accountIdentifier,
      encryptedSecret,
    });

    // Audit Trail
    this.auditLogService.logAsync({
      action: AuditAction.ASSET_CREATED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId: pewarisId },
      resource: 'assets',
      resourceId: asset.id,
      description: `Pewaris (${pewarisId}) mendaftarkan aset digital baru "${asset.assetName}" di platform ${asset.platform}.`,
      afterState: { type: asset.type, assetName: asset.assetName },
    });

    return this.toResponseDto(asset);
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
