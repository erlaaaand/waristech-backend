import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { IInvitationRepository } from '../../domains/repositories/invitation.repository.interface';
import {
  InvitationDomain,
  InvitationStatus,
} from '../../domains/entities/invitation.entity';
import { InvitationTypeOrmEntity } from '../entities/invitation.typeorm-entity';

@Injectable()
export class InvitationRepository implements IInvitationRepository {
  constructor(
    @InjectRepository(InvitationTypeOrmEntity)
    private readonly repo: Repository<InvitationTypeOrmEntity>,
  ) {}

  private toDomain(entity: InvitationTypeOrmEntity): InvitationDomain {
    return new InvitationDomain(
      entity.id,
      entity.code,
      entity.pewarisId,
      entity.status,
      entity.expiresAt,
      entity.usedByAhliWarisId,
      entity.createdAt,
    );
  }

  async create(data: {
    id: string;
    code: string;
    pewarisId: string;
    expiresAt: Date;
  }): Promise<InvitationDomain> {
    const entity = this.repo.create({
      id: data.id,
      code: data.code,
      pewarisId: data.pewarisId,
      expiresAt: data.expiresAt,
      status: InvitationStatus.PENDING,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findByCode(code: string): Promise<InvitationDomain | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPewarisId(pewarisId: string): Promise<InvitationDomain[]> {
    const entities = await this.repo.find({
      where: { pewarisId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async markAsUsed(
    code: string,
    ahliWarisId: string,
  ): Promise<InvitationDomain> {
    await this.repo.update(
      { code },
      { status: InvitationStatus.USED, usedByAhliWarisId: ahliWarisId },
    );
    const entity = await this.repo.findOneOrFail({ where: { code } });
    return this.toDomain(entity);
  }

  async markExpiredByPewarisId(pewarisId: string): Promise<void> {
    await this.repo.update(
      {
        pewarisId,
        status: InvitationStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      { status: InvitationStatus.EXPIRED },
    );
  }
}
