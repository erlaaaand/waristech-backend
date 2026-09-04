import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IFamilyMemberRepository } from '../../domains/repositories/family-member.repository.interface';
import {
  FamilyMemberDomain,
  FamilyMemberStatus,
  RelationshipType,
} from '../../domains/entities/family-member.entity';
import { FamilyMemberTypeOrmEntity } from '../entities/family-member.typeorm-entity';
import { InvalidFamilyMemberStatusTransitionException } from '../../domains/exceptions/inheritance.exception';

@Injectable()
export class FamilyMemberRepository implements IFamilyMemberRepository {
  constructor(
    @InjectRepository(FamilyMemberTypeOrmEntity)
    private readonly repo: Repository<FamilyMemberTypeOrmEntity>,
  ) {}

  private toDomain(entity: FamilyMemberTypeOrmEntity): FamilyMemberDomain {
    return new FamilyMemberDomain(
      entity.id,
      entity.pewarisId,
      entity.ahliWarisId,
      entity.relationshipType,
      entity.relationshipDescription,
      entity.status,
      entity.supportingDocumentUrl,
      entity.verifiedByNotarisId,
      entity.verifiedAt,
      entity.createdAt,
    );
  }

  async create(data: {
    id: string;
    pewarisId: string;
    ahliWarisId: string;
    relationshipType: RelationshipType;
    relationshipDescription: string;
    supportingDocumentUrl?: string | null;
  }): Promise<FamilyMemberDomain> {
    const isNonNasab = data.relationshipType === RelationshipType.NON_NASAB;

    const entity = this.repo.create({
      id: data.id,
      pewarisId: data.pewarisId,
      ahliWarisId: data.ahliWarisId,
      relationshipType: data.relationshipType,
      relationshipDescription: data.relationshipDescription,
      supportingDocumentUrl: data.supportingDocumentUrl ?? null,
      status: isNonNasab
        ? FamilyMemberStatus.PENDING_VERIFICATION
        : FamilyMemberStatus.PENDING_CONFIRMATION,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findByPewarisId(pewarisId: string): Promise<FamilyMemberDomain[]> {
    const entities = await this.repo.find({
      where: { pewarisId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByAhliWarisId(ahliWarisId: string): Promise<FamilyMemberDomain[]> {
    const entities = await this.repo.find({
      where: { ahliWarisId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<FamilyMemberDomain | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByStatus(
    status: FamilyMemberStatus,
  ): Promise<FamilyMemberDomain[]> {
    const entities = await this.repo.find({
      where: { status },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async verify(id: string, notarisId: string): Promise<FamilyMemberDomain> {
    // UPDATE bersyarat — hanya berhasil dari status PENDING_VERIFICATION,
    // menutup race klik-ganda/urutan-tidak-wajar.
    const result = await this.repo.update(
      { id, status: FamilyMemberStatus.PENDING_VERIFICATION },
      {
        status: FamilyMemberStatus.VERIFIED,
        verifiedByNotarisId: notarisId,
        verifiedAt: new Date(),
      },
    );
    if (!result.affected) {
      throw new InvalidFamilyMemberStatusTransitionException();
    }
    const entity = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(entity);
  }

  async reject(id: string, notarisId: string): Promise<FamilyMemberDomain> {
    const result = await this.repo.update(
      { id, status: FamilyMemberStatus.PENDING_VERIFICATION },
      {
        status: FamilyMemberStatus.REJECTED,
        verifiedByNotarisId: notarisId,
        verifiedAt: new Date(),
      },
    );
    if (!result.affected) {
      throw new InvalidFamilyMemberStatusTransitionException();
    }
    const entity = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(entity);
  }

  async confirmByPewaris(id: string): Promise<FamilyMemberDomain> {
    const result = await this.repo.update(
      { id, status: FamilyMemberStatus.PENDING_CONFIRMATION },
      { status: FamilyMemberStatus.VERIFIED },
    );
    if (!result.affected) {
      throw new InvalidFamilyMemberStatusTransitionException();
    }
    const entity = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(entity);
  }
}
