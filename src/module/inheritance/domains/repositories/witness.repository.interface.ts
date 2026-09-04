import { WitnessTypeOrmEntity } from '../../infrastructures/entities/witness.typeorm-entity';
import { WitnessStatus } from '../enums/witness.enum';

export interface ICreateWitnessData {
  id: string;
  pewarisId: string;
  name: string;
  email: string;
  phone: string;
}

export abstract class IWitnessRepository {
  abstract create(data: ICreateWitnessData): Promise<WitnessTypeOrmEntity>;
  abstract findById(id: string): Promise<WitnessTypeOrmEntity | null>;
  abstract findByPewarisId(pewarisId: string): Promise<WitnessTypeOrmEntity[]>;
  abstract findByToken(token: string): Promise<WitnessTypeOrmEntity | null>;
  abstract save(witness: WitnessTypeOrmEntity): Promise<WitnessTypeOrmEntity>;
  /**
   * UPDATE bersyarat: hanya berhasil bila status saat ini masih PENDING.
   * @returns `true` bila benar-benar berubah, `false` bila saksi ini sudah
   *   memutuskan sebelumnya (race/klik ganda) — pemanggil wajib menangani ini.
   */
  abstract updateStatusIfPending(
    id: string,
    status: WitnessStatus,
  ): Promise<boolean>;
}
