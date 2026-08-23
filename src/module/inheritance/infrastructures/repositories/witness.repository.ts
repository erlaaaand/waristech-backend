import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IWitnessRepository } from './witness.repository.interface';
import { WitnessTypeOrmEntity } from '../entities/witness.typeorm-entity';
import { WitnessStatus } from '../../domains/enums/witness.enum';

@Injectable()
export class WitnessRepository implements IWitnessRepository {
  constructor(
    @InjectRepository(WitnessTypeOrmEntity)
    private readonly repo: Repository<WitnessTypeOrmEntity>,
  ) {}

  async findById(id: string): Promise<WitnessTypeOrmEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByPewarisId(pewarisId: string): Promise<WitnessTypeOrmEntity[]> {
    return this.repo.find({ where: { pewarisId } });
  }

  async findByToken(token: string): Promise<WitnessTypeOrmEntity | null> {
    return this.repo.findOne({ where: { magicLinkToken: token } });
  }

  async save(witness: WitnessTypeOrmEntity): Promise<WitnessTypeOrmEntity> {
    return this.repo.save(witness);
  }

  async updateStatus(id: string, status: WitnessStatus): Promise<void> {
    await this.repo.update(id, { status });
  }
}
