import { Injectable } from '@nestjs/common';
import { WitnessResponseDto } from '../dto/inheritance-response.dto';
import { IWitnessRepository } from '../../domains/repositories/witness.repository.interface';

@Injectable()
export class GetMyWitnessesUseCase {
  constructor(private readonly witnessRepo: IWitnessRepository) {}

  async execute(pewarisId: string): Promise<WitnessResponseDto[]> {
    const witnesses = await this.witnessRepo.findByPewarisId(pewarisId);

    return witnesses.map((w) => ({
      id: w.id,
      pewarisId: w.pewarisId,
      name: w.name,
      email: w.email,
      phone: w.phone,
      status: w.status,
      createdAt: w.createdAt,
    }));
  }
}
