import { WitnessTypeOrmEntity } from '../entities/witness.typeorm-entity';
import { WitnessStatus } from '../../domains/enums/witness.enum';

export abstract class IWitnessRepository {
  abstract findById(id: string): Promise<WitnessTypeOrmEntity | null>;
  abstract findByPewarisId(pewarisId: string): Promise<WitnessTypeOrmEntity[]>;
  abstract findByToken(token: string): Promise<WitnessTypeOrmEntity | null>;
  abstract save(witness: WitnessTypeOrmEntity): Promise<WitnessTypeOrmEntity>;
  abstract updateStatus(id: string, status: WitnessStatus): Promise<void>;
}
