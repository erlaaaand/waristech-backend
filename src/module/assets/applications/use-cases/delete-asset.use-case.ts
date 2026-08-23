import { Inject, Injectable } from '@nestjs/common';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  AssetAlreadyVerifiedException,
  AssetNotFoundException,
  AssetNotOwnedException,
} from '../../domains/exceptions/asset.exception';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';

@Injectable()
export class DeleteAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(id: string, pewarisId: string): Promise<void> {
    const asset = await this.assetRepo.findById(id);

    if (!asset) throw new AssetNotFoundException();
    if (!asset.isOwnedBy(pewarisId)) throw new AssetNotOwnedException();
    if (asset.isVerified()) {
      throw new AssetAlreadyVerifiedException();
    }

    const snapshot = {
      assetName: asset.assetName,
      type: asset.type,
      platform: asset.platform,
      status: asset.status,
    };

    await this.assetRepo.delete(id);

    this.auditLogService.logAsync({
      action: AuditAction.ASSET_DELETED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.WARNING,
      status: AuditStatus.SUCCESS,
      actor: { userId: pewarisId },
      resource: 'assets',
      resourceId: id,
      description: `Pewaris (${pewarisId}) menghapus harta warisan "${snapshot.assetName}".`,
      beforeState: snapshot,
      afterState: null,
    });
  }
}
