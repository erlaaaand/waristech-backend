// src/shared/storage/infrastructures/repositories/stored-file.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredFileDomain } from '../../domains/entities/stored-file.entity';
import { StoredFileTypeOrmEntity } from '../entities/stored-file.typeorm-entity';
import {
  IStoredFileRepository,
  type ICreateStoredFileData,
} from '../../domains/repositories/stored-file.repository.interface';

@Injectable()
export class StoredFileRepository implements IStoredFileRepository {
  constructor(
    @InjectRepository(StoredFileTypeOrmEntity)
    private readonly ormRepo: Repository<StoredFileTypeOrmEntity>,
  ) {}

  private toDomain(entity: StoredFileTypeOrmEntity): StoredFileDomain {
    return new StoredFileDomain(
      entity.id,
      entity.userId,
      entity.fileKey,
      entity.fileUrl,
      entity.originalName,
      entity.mimeType,
      entity.sizeInBytes,
      entity.purpose,
      entity.provider,
      entity.createdAt,
    );
  }

  async create(data: ICreateStoredFileData): Promise<StoredFileDomain> {
    const entity = this.ormRepo.create(data);
    const saved = await this.ormRepo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<StoredFileDomain | null> {
    const entity = await this.ormRepo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByFileKey(fileKey: string): Promise<StoredFileDomain | null> {
    const entity = await this.ormRepo.findOne({ where: { fileKey } });
    return entity ? this.toDomain(entity) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.ormRepo.delete(id);
  }
}
