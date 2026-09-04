import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  IKeyShareRepository,
  type ICreateKeyShareData,
} from '../../domains/repositories/key-share.repository.interface';
import { KeyShareDomain } from '../../domains/entities/key-share.entity';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';
import { KeyShareTypeOrmEntity } from '../entities/key-share.typeorm-entity';

@Injectable()
export class KeyShareRepository implements IKeyShareRepository {
  constructor(
    @InjectRepository(KeyShareTypeOrmEntity)
    private readonly repo: Repository<KeyShareTypeOrmEntity>,
  ) {}

  private toDomain(entity: KeyShareTypeOrmEntity): KeyShareDomain {
    return new KeyShareDomain(
      entity.id,
      entity.assetId,
      entity.holder,
      entity.encryptedShare,
      entity.createdAt,
    );
  }

  async createMany(
    assetId: string,
    shares: ICreateKeyShareData[],
  ): Promise<KeyShareDomain[]> {
    const entities = shares.map((s) =>
      this.repo.create({
        id: randomUUID(),
        assetId,
        holder: s.holder,
        encryptedShare: s.encryptedShare,
      }),
    );
    const saved = await this.repo.save(entities);
    return saved.map((e) => this.toDomain(e));
  }

  async findByAssetId(assetId: string): Promise<KeyShareDomain[]> {
    const entities = await this.repo.find({ where: { assetId } });
    return entities.map((e) => this.toDomain(e));
  }

  async findByAssetIdAndHolder(
    assetId: string,
    holder: KeyShareHolder,
  ): Promise<KeyShareDomain | null> {
    const entity = await this.repo.findOne({ where: { assetId, holder } });
    return entity ? this.toDomain(entity) : null;
  }

  async deleteByAssetId(assetId: string): Promise<void> {
    await this.repo.delete({ assetId });
  }
}
