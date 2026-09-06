import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  IDeathVerificationRepository,
  type ICreateDeathVerificationData,
} from '../../domains/repositories/death-verification.repository.interface';
import { DeathVerificationDomain } from '../../domains/entities/death-verification.entity';
import { DeathVerificationTypeOrmEntity } from '../entities/death-verification.typeorm-entity';

@Injectable()
export class DeathVerificationRepository implements IDeathVerificationRepository {
  constructor(
    @InjectRepository(DeathVerificationTypeOrmEntity)
    private readonly repo: Repository<DeathVerificationTypeOrmEntity>,
  ) {}

  private toDomain(
    entity: DeathVerificationTypeOrmEntity,
  ): DeathVerificationDomain {
    return new DeathVerificationDomain(
      entity.id,
      entity.pewarisId,
      entity.documentUrl,
      entity.submittedByUserId,
      entity.verifiedByNotarisId,
      entity.verifiedAt,
      entity.createdAt,
    );
  }

  async create(
    data: ICreateDeathVerificationData,
  ): Promise<DeathVerificationDomain> {
    const entity = this.repo.create(data);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<DeathVerificationDomain | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPewarisId(pewarisId: string): Promise<DeathVerificationDomain[]> {
    const entities = await this.repo.find({
      where: { pewarisId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findPending(): Promise<DeathVerificationDomain[]> {
    const entities = await this.repo.find({
      where: { verifiedByNotarisId: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async verify(
    id: string,
    notarisId: string,
  ): Promise<DeathVerificationDomain> {
    await this.repo.update(id, {
      verifiedByNotarisId: notarisId,
      verifiedAt: new Date(),
    });
    const entity = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(entity);
  }
}
