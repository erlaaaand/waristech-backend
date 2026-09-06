import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import type {
  IAssetRepository,
  ICreateAssetData,
  IUpdateAssetData,
  IUpsertAllocationData,
} from '../../domains/repositories/asset.repository.interface';
import { AssetDomain } from '../../domains/entities/asset.entity';
import { AssetAllocationDomain } from '../../domains/entities/asset-allocation.entity';
import { AssetStatus, AssetCustodyType } from '../../domains/enums/asset.enum';
import { AssetTypeOrmEntity } from '../entities/asset.typeorm-entity';
import { AssetAllocationTypeOrmEntity } from '../entities/asset-allocation.typeorm-entity';
import {
  AssetAlreadyVerifiedException,
  AssetNotFoundException,
  InvalidAssetStatusTransitionException,
} from '../../domains/exceptions/asset.exception';

@Injectable()
export class AssetRepository implements IAssetRepository {
  constructor(
    @InjectRepository(AssetTypeOrmEntity)
    private readonly assetRepo: Repository<AssetTypeOrmEntity>,
    @InjectRepository(AssetAllocationTypeOrmEntity)
    private readonly allocationRepo: Repository<AssetAllocationTypeOrmEntity>,
  ) {}

  private toAllocationDomain(
    entity: AssetAllocationTypeOrmEntity,
  ): AssetAllocationDomain {
    return new AssetAllocationDomain(
      entity.id,
      entity.assetId,
      entity.ahliWarisId,
      Number(entity.percentage),
      entity.isExecutor,
      entity.acknowledgedAt,
      entity.createdAt,
    );
  }

  private toDomain(entity: AssetTypeOrmEntity): AssetDomain {
    const allocations = (entity.allocations || []).map((a) =>
      this.toAllocationDomain(a),
    );
    return new AssetDomain(
      entity.id,
      entity.pewarisId,
      entity.type,
      entity.assetName,
      entity.platform,
      entity.accountIdentifier,
      entity.encryptedSecret,
      entity.custodyType,
      entity.status,
      entity.assignedNotarisId,
      entity.verifiedByNotarisId,
      entity.verifiedAt,
      entity.cooldownEndsAt,
      entity.keysRotatedAt,
      allocations,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  async create(data: ICreateAssetData): Promise<AssetDomain> {
    const entity = this.assetRepo.create({
      id: data.id,
      pewarisId: data.pewarisId,
      type: data.type,
      assetName: data.assetName,
      platform: data.platform,
      accountIdentifier: data.accountIdentifier,
      custodyType: data.custodyType,
      assignedNotarisId: data.assignedNotarisId,
      encryptedSecret: data.encryptedSecret ?? '',
      status: AssetStatus.PENDING_VERIFICATION,
    });
    const saved = await this.assetRepo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<AssetDomain | null> {
    const entity = await this.assetRepo.findOne({
      where: { id },
      relations: { allocations: true },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPewarisId(pewarisId: string): Promise<AssetDomain[]> {
    const entities = await this.assetRepo.find({
      where: { pewarisId },
      relations: { allocations: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByStatus(status: AssetStatus): Promise<AssetDomain[]> {
    const entities = await this.assetRepo.find({
      where: { status },
      relations: { allocations: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByStatuses(statuses: AssetStatus[]): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where('asset.status IN (:...statuses)', { statuses });
    qb.orderBy('asset.createdAt', 'DESC');

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findByAssignedNotarisIdAndStatuses(assignedNotarisId: string, statuses: AssetStatus[]): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where('asset.assignedNotarisId = :assignedNotarisId', { assignedNotarisId });
    qb.andWhere('asset.status IN (:...statuses)', { statuses });
    qb.orderBy('asset.createdAt', 'DESC');

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findByAhliWarisId(ahliWarisId: string): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where('allocations.ahliWarisId = :ahliWarisId', { ahliWarisId });
    qb.orderBy('asset.createdAt', 'DESC');

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async update(id: string, data: IUpdateAssetData): Promise<AssetDomain> {
    await this.assetRepo.update(id, { ...data });
    const updated = await this.assetRepo.findOneOrFail({
      where: { id },
      relations: { allocations: true },
    });
    return this.toDomain(updated);
  }

  async verify(id: string, notarisId: string): Promise<AssetDomain> {
    // UPDATE bersyarat (WHERE status = PENDING_VERIFICATION) — mencegah aset
    // yang sudah pindah status (klik ganda, tab basi, atau request lain yang
    // menang race) diam-diam ditarik kembali ke VERIFIED.
    const result = await this.assetRepo.update(
      { id, status: AssetStatus.PENDING_VERIFICATION },
      {
        status: AssetStatus.VERIFIED,
        verifiedByNotarisId: notarisId,
        verifiedAt: new Date(),
      },
    );
    if (!result.affected) {
      throw new InvalidAssetStatusTransitionException(
        'Aset ini sudah tidak berstatus menunggu verifikasi (mungkin sudah diproses oleh permintaan lain).',
      );
    }
    const updated = await this.assetRepo.findOneOrFail({
      where: { id },
      relations: { allocations: true },
    });
    return this.toDomain(updated);
  }

  async reject(id: string, notarisId: string): Promise<AssetDomain> {
    const result = await this.assetRepo.update(
      { id, status: AssetStatus.PENDING_VERIFICATION },
      {
        status: AssetStatus.REJECTED,
        verifiedByNotarisId: notarisId,
        verifiedAt: new Date(),
      },
    );
    if (!result.affected) {
      throw new InvalidAssetStatusTransitionException(
        'Aset ini sudah tidak berstatus menunggu verifikasi (mungkin sudah diproses oleh permintaan lain).',
      );
    }
    const updated = await this.assetRepo.findOneOrFail({
      where: { id },
      relations: { allocations: true },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.assetRepo.delete(id);
  }

  async closeAndShred(id: string): Promise<AssetDomain> {
    const result = await this.assetRepo.update(
      {
        id,
        status: In([AssetStatus.DISTRIBUTED, AssetStatus.DISPUTED_LIQUIDATION]),
      },
      { status: AssetStatus.CLOSED, encryptedSecret: '' },
    );
    if (!result.affected) {
      throw new InvalidAssetStatusTransitionException(
        'Kasus ini sudah tidak berstatus DISTRIBUTED/DISPUTED_LIQUIDATION (mungkin sudah ditutup oleh permintaan lain).',
      );
    }
    const updated = await this.assetRepo.findOneOrFail({
      where: { id },
      relations: { allocations: true },
    });
    return this.toDomain(updated);
  }

  // ── Allocations ──────────────────────────────────────────────────────────

  async upsertAllocation(
    data: IUpsertAllocationData,
  ): Promise<AssetAllocationDomain> {
    // Cari berdasarkan (assetId, ahliWarisId) — BUKAN `id` (yang selalu baru
    // di-generate pemanggil) — supaya alokasi ulang untuk ahli waris yang
    // sama MENGOREKSI baris yang sudah ada, bukan menumpuk baris duplikat.
    let entity = await this.allocationRepo.findOne({
      where: { assetId: data.assetId, ahliWarisId: data.ahliWarisId },
    });

    if (entity) {
      entity.percentage = data.percentage;
      entity.isExecutor = data.isExecutor;
    } else {
      entity = this.allocationRepo.create({
        id: data.id,
        assetId: data.assetId,
        ahliWarisId: data.ahliWarisId,
        percentage: data.percentage,
        isExecutor: data.isExecutor,
      });
    }

    const saved = await this.allocationRepo.save(entity);
    return this.toAllocationDomain(saved);
  }

  async allocateAtomic(
    assetId: string,
    ahliWarisId: string,
    percentage: number,
    isExecutor: boolean,
  ): Promise<AssetAllocationDomain> {
    // Seluruh baca-validasi-tulis dilakukan dalam SATU transaksi dengan row
    // lock (`FOR UPDATE`) pada baris aset — menutup race condition saat dua
    // request alokasi untuk aset yang sama masuk hampir bersamaan.
    return this.assetRepo.manager.transaction(async (manager) => {
      const assetEntity = await manager.findOne(AssetTypeOrmEntity, {
        where: { id: assetId },
        relations: { allocations: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!assetEntity) {
        throw new AssetNotFoundException();
      }

      const assetDomain = this.toDomain(assetEntity);
      if (assetDomain.isVerified()) {
        throw new AssetAlreadyVerifiedException(
          'Aset yang sudah diverifikasi tidak dapat diubah alokasinya.',
        );
      }
      // Validasi ulang di dalam lock — sisa kapasitas yang dibaca sebelum
      // masuk transaksi bisa saja sudah basi.
      assetDomain.validateNewAllocation(percentage, ahliWarisId);

      if (isExecutor) {
        const hasOtherExecutor = assetEntity.allocations.some(
          (a) => a.isExecutor && a.ahliWarisId !== ahliWarisId,
        );
        if (hasOtherExecutor) {
          throw new AssetAlreadyVerifiedException(
            'Aset ini sudah memiliki Eksekutor. Hapus penunjukan sebelumnya terlebih dahulu.',
          );
        }
      }

      const allocationRepo = manager.getRepository(
        AssetAllocationTypeOrmEntity,
      );
      let entity = await allocationRepo.findOne({
        where: { assetId, ahliWarisId },
      });
      if (entity) {
        entity.percentage = percentage;
        entity.isExecutor = isExecutor;
      } else {
        entity = allocationRepo.create({
          id: randomUUID(),
          assetId,
          ahliWarisId,
          percentage,
          isExecutor,
        });
      }
      const saved = await allocationRepo.save(entity);
      return this.toAllocationDomain(saved);
    });
  }

  async deleteAllocation(allocationId: string): Promise<void> {
    await this.allocationRepo.delete(allocationId);
  }

  async findAllocationsByAssetId(
    assetId: string,
  ): Promise<AssetAllocationDomain[]> {
    const entities = await this.allocationRepo.find({
      where: { assetId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toAllocationDomain(e));
  }

  async acknowledgeAllocation(allocationId: string): Promise<void> {
    await this.allocationRepo.update(allocationId, {
      acknowledgedAt: new Date(),
    });
  }

  // ── Scheduler & Background Tasks ──────────────────────────────────────────

  /**
   * Aset VAULT terverifikasi yang bagian kuncinya belum pernah dirotasi sejak
   * `threshold`. Basisnya `keysRotatedAt` — BUKAN `updatedAt` — karena rotasi
   * hanya menyentuh tabel asset_key_shares, sehingga updatedAt tidak berubah
   * dan pengingat akan terkirim berulang selamanya.
   */
  async findStaleAssets(threshold: Date): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where('asset.status = :status', { status: AssetStatus.VERIFIED });
    qb.andWhere('asset.custodyType = :custody', {
      custody: AssetCustodyType.VAULT,
    });
    qb.andWhere('asset.keysRotatedAt IS NOT NULL');
    qb.andWhere('asset.keysRotatedAt < :threshold', { threshold });

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findStaleLiquidations(threshold: Date): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where('asset.status IN (:...statuses)', {
      statuses: [AssetStatus.UNLOCKED, AssetStatus.LIQUIDATING],
    });
    qb.andWhere('asset.updatedAt < :threshold', { threshold });

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findExpiredCooldowns(now: Date): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where('asset.status = :status', {
      status: AssetStatus.PENDING_COOLDOWN,
    });
    qb.andWhere('asset.cooldownEndsAt <= :now', { now });

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findAllWithLegacySecret(): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where("asset.encryptedSecret != ''");

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }
}
