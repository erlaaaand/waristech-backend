import { Inject, Injectable } from '@nestjs/common';
import { UpdateAssetDto } from '../dto/update-asset.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import { BadRequestException } from '@nestjs/common';
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

    // Kredensial TIDAK boleh diperbarui lewat jalur ini. Menyimpannya kembali
    // sebagai `encryptedSecret` tunggal akan mengembalikan kerentanan yang sudah
    // ditutup (server kembali memegang kunci utuh), sekaligus membuat bagian
    // kunci Shamir yang ada menjadi basi/tidak sinkron.
    if (dto.secret) {
      throw new BadRequestException(
        'Kredensial tidak dapat diubah lewat endpoint ini. Gunakan POST /assets/:id/rotate-shares — ' +
          'pemecahan ulang kunci wajib dilakukan di sisi klien agar server tidak pernah memegang kunci utuh.',
      );
    }

    const updated = await this.assetRepo.update(id, {
      type: dto.type,
      assetName: dto.assetName,
      platform: dto.platform,
      accountIdentifier: dto.accountIdentifier,
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
      custodyType: asset.custodyType,
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
