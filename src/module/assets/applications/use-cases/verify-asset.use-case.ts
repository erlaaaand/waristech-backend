import { Inject, Injectable } from '@nestjs/common';
import { AssetResponseDto } from '../dto/asset-response.dto';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { AssetNotFoundException } from '../../domains/exceptions/asset.exception';
import { AssetDomain } from '../../domains/entities/asset.entity';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';

@Injectable()
export class VerifyAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async verify(id: string, notarisId: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepo.findById(id);

    if (!asset) throw new AssetNotFoundException();

    const before = { status: asset.status };
    const updated = await this.assetRepo.verify(id, notarisId);

    this.auditLogService.logAsync({
      action: AuditAction.ASSET_VERIFIED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.CRITICAL,
      status: AuditStatus.SUCCESS,
      actor: { userId: notarisId },
      resource: 'assets',
      resourceId: id,
      description: `Notaris (${notarisId}) memverifikasi aset digital "${updated.assetName}" milik Pewaris (${updated.pewarisId}).`,
      beforeState: before,
      afterState: { status: updated.status, verifiedAt: updated.verifiedAt },
    });

    return this.toResponseDto(updated);
  }

  async reject(id: string, notarisId: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepo.findById(id);

    if (!asset) throw new AssetNotFoundException();

    const before = { status: asset.status };
    const updated = await this.assetRepo.reject(id, notarisId);

    this.auditLogService.logAsync({
      action: AuditAction.ASSET_REJECTED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.WARNING,
      status: AuditStatus.SUCCESS,
      actor: { userId: notarisId },
      resource: 'assets',
      resourceId: id,
      description: `Notaris (${notarisId}) menolak verifikasi aset "${updated.assetName}" milik Pewaris (${updated.pewarisId}).`,
      beforeState: before,
      afterState: { status: updated.status },
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
