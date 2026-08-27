import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  IAssetRepository,
  ICreateAssetData,
  IUpdateAssetData,
  IUpsertAllocationData,
} from '../../domains/repositories/asset.repository.interface';
import { AssetDomain } from '../../domains/entities/asset.entity';
import { AssetAllocationDomain } from '../../domains/entities/asset-allocation.entity';
import { AssetStatus } from '../../domains/enums/asset.enum';
import { AssetTypeOrmEntity } from '../entities/asset.typeorm-entity';
import { AssetAllocationTypeOrmEntity } from '../entities/asset-allocation.typeorm-entity';

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
      entity.status,
      entity.verifiedByNotarisId,
      entity.verifiedAt,
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
      encryptedSecret: data.encryptedSecret,
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
    await this.assetRepo.update(id, {
      status: AssetStatus.VERIFIED,
      verifiedByNotarisId: notarisId,
      verifiedAt: new Date(),
    });
    const updated = await this.assetRepo.findOneOrFail({
      where: { id },
      relations: { allocations: true },
    });
    return this.toDomain(updated);
  }

  async reject(id: string, notarisId: string): Promise<AssetDomain> {
    await this.assetRepo.update(id, {
      status: AssetStatus.REJECTED,
      verifiedByNotarisId: notarisId,
      verifiedAt: new Date(),
    });
    const updated = await this.assetRepo.findOneOrFail({
      where: { id },
      relations: { allocations: true },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.assetRepo.delete(id);
  }

  // ── Allocations ──────────────────────────────────────────────────────────

  async upsertAllocation(
    data: IUpsertAllocationData,
  ): Promise<AssetAllocationDomain> {
    let entity = await this.allocationRepo.findOne({
      where: { id: data.id },
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

  async findStaleAssets(threshold: Date): Promise<AssetDomain[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.leftJoinAndSelect('asset.allocations', 'allocations');
    qb.where('asset.status = :status', { status: AssetStatus.VERIFIED });
    qb.andWhere('asset.updatedAt < :threshold', { threshold });

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
}
