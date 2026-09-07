import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import { CreateAssetResponseDto } from '../dto/create-asset-response.dto';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';
import { AssetCustodyType } from '../../domains/enums/asset.enum';
import { InheritanceGuidanceService } from '../../domains/services/inheritance-guidance.service';
import {
  ASSET_REPOSITORY_TOKEN,
  type IAssetRepository,
} from '../../domains/repositories/asset.repository.interface';
import {
  SECRET_SHARING_SERVICE_TOKEN,
  type ISecretSharingService,
} from '../../domains/services/secret-sharing.service.interface';
import {
  KEY_SHARE_REPOSITORY_TOKEN,
  type IKeyShareRepository,
} from '../../domains/repositories/key-share.repository.interface';
import { AssetDomain } from '../../domains/entities/asset.entity';
import { CalculationMethod } from '../../../calculation/domains/enums/calculation.enum';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../../shared/audit/domains/enums/audit.enum';
import { AssetNotifierService } from '../services/asset-notifier.service';
import { NotificationType } from '../../../shared/notifications/entities/notification.entity';

const SCHEME_LABELS: Record<CalculationMethod, string> = {
  [CalculationMethod.FARAIDH]: 'Faraidh',
  [CalculationMethod.CIVIL]: 'Perdata',
  [CalculationMethod.CUSTOMARY]: 'Adat',
};

@Injectable()
export class CreateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY_TOKEN)
    private readonly assetRepo: IAssetRepository,
    @Inject(SECRET_SHARING_SERVICE_TOKEN)
    private readonly secretSharingService: ISecretSharingService,
    @Inject(KEY_SHARE_REPOSITORY_TOKEN)
    private readonly keyShareRepo: IKeyShareRepository,
    private readonly guidanceService: InheritanceGuidanceService,
    private readonly auditLogService: AuditLogService,
    private readonly notifier: AssetNotifierService,
  ) {}

  async execute(
    pewarisId: string,
    dto: CreateAssetDto,
  ): Promise<CreateAssetResponseDto> {
    const assetId = randomUUID();
    const custodyType = dto.custodyType ?? AssetCustodyType.VAULT;

    const asset = await this.assetRepo.create({
      id: assetId,
      pewarisId,
      type: dto.type,
      assetName: dto.assetName,
      platform: dto.platform,
      accountIdentifier: dto.accountIdentifier,
      assignedNotarisId: dto.assignedNotarisId,
      inheritanceScheme: dto.inheritanceScheme ?? null,
      custodyType,
    });

    if (asset.inheritanceScheme) {
      await this.notifier.notifyUser(
        asset.assignedNotarisId!,
        'Skema Waris Ditetapkan',
        `Pewaris menetapkan skema ${SCHEME_LABELS[asset.inheritanceScheme]} ` +
          `untuk aset "${asset.assetName}". Skema ini mengikat begitu Anda ` +
          'memverifikasi aset -- pastikan eksekusi pembagian mengikuti wasiat yang diberikan.',
        NotificationType.INFO,
      );
    }

    // ── Jalur GUIDANCE: kredensial tidak pernah masuk sistem ────────────────
    if (custodyType === AssetCustodyType.GUIDANCE) {
      this.logAssetCreated(pewarisId, asset, custodyType);

      return {
        asset: this.toResponseDto(asset),
        executorShare: null,
        notarisShare: null,
        guidance: this.guidanceService.getGuidance(asset.type, asset.platform),
        warning:
          'Aset ini dicatat TANPA penitipan kredensial. Ahli waris menempuh prosedur resmi lembaga terkait sesuai panduan di atas.',
      };
    }

    // ── Jalur VAULT: pecah kredensial jadi 3 bagian Shamir (threshold 2) ────
    const secretJson = JSON.stringify(dto.secret);
    const shares = await this.secretSharingService.splitSecret(secretJson);

    const shareOf = (holder: KeyShareHolder): string => {
      const found = shares.find((s) => s.holder === holder);
      if (!found) {
        throw new Error(`Bagian kunci ${holder} gagal dibuat.`);
      }
      return found.rawShare;
    };

    // HANYA bagian SYSTEM yang dipersistensikan. Bagian EXECUTOR & NOTARIS
    // dikembalikan sekali ke Pewaris lalu dilupakan server — inilah yang membuat
    // server tidak pernah memegang cukup bahan untuk membuka brankas sendirian.
    await this.keyShareRepo.createMany(assetId, [
      {
        holder: KeyShareHolder.SYSTEM,
        encryptedShare: this.secretSharingService.sealSystemShare(
          shareOf(KeyShareHolder.SYSTEM),
          assetId,
        ),
      },
    ]);

    // Titik awal hitungan usia kunci untuk pengingat rotasi berkala.
    await this.assetRepo.update(assetId, { keysRotatedAt: new Date() });

    this.logAssetCreated(pewarisId, asset, custodyType);

    return {
      asset: this.toResponseDto(asset),
      executorShare: shareOf(KeyShareHolder.EXECUTOR),
      notarisShare: shareOf(KeyShareHolder.NOTARIS),
      guidance: null,
      warning:
        'Simpan kedua bagian kunci di atas SEKARANG. Server tidak menyimpannya dan nilai ini tidak akan pernah ditampilkan lagi.',
    };
  }

  private logAssetCreated(
    pewarisId: string,
    asset: AssetDomain,
    custodyType: AssetCustodyType,
  ): void {
    this.auditLogService.logAsync({
      action: AuditAction.ASSET_CREATED,
      category: AuditCategory.WARIS_ASSET,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      actor: { userId: pewarisId },
      resource: 'assets',
      resourceId: asset.id,
      description: `Pewaris (${pewarisId}) mendaftarkan aset digital baru "${asset.assetName}" di platform ${asset.platform} (kustodi: ${custodyType}).`,
      afterState: {
        type: asset.type,
        assetName: asset.assetName,
        custodyType,
      },
    });
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
      assignedNotarisId: asset.assignedNotarisId,
      inheritanceScheme: asset.inheritanceScheme,
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
