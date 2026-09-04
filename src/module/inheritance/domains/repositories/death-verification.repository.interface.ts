import { DeathVerificationDomain } from '../entities/death-verification.entity';

export const DEATH_VERIFICATION_REPOSITORY_TOKEN = Symbol(
  'IDeathVerificationRepository',
);

export interface ICreateDeathVerificationData {
  id: string;
  pewarisId: string;
  documentUrl: string;
  submittedByUserId: string;
}

export interface IDeathVerificationRepository {
  create(data: ICreateDeathVerificationData): Promise<DeathVerificationDomain>;
  findById(id: string): Promise<DeathVerificationDomain | null>;
  findByPewarisId(pewarisId: string): Promise<DeathVerificationDomain[]>;
  verify(id: string, notarisId: string): Promise<DeathVerificationDomain>;
}
