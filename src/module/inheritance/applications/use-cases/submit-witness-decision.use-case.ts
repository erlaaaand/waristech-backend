import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubmitWitnessDecisionDto } from '../dto/submit-witness-decision.dto';
import { IWitnessRepository } from '../../infrastructures/repositories/witness.repository.interface';
import { WitnessStatus } from '../../domains/enums/witness.enum';

@Injectable()
export class SubmitWitnessDecisionUseCase {
  constructor(
    private readonly witnessRepo: IWitnessRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: SubmitWitnessDecisionDto,
    guestUserId: string,
  ): Promise<{ message: string }> {
    const witness = await this.witnessRepo.findById(dto.witnessId);
    if (!witness) {
      throw new NotFoundException('Witness not found');
    }

    if (witness.id !== guestUserId) {
      throw new UnauthorizedException(
        'Anda tidak berhak membuat keputusan untuk Saksi ini',
      );
    }

    // Ensure the witness is pending
    if (witness.status !== WitnessStatus.PENDING) {
      throw new BadRequestException('Witness has already submitted a decision');
    }

    if (
      dto.decision !== WitnessStatus.APPROVE &&
      dto.decision !== WitnessStatus.DISPUTE
    ) {
      throw new BadRequestException('Invalid decision');
    }

    // Update the witness decision
    await this.witnessRepo.updateStatus(witness.id, dto.decision);

    if (dto.decision === WitnessStatus.DISPUTE) {
      // Trigger asset freezing mechanism via Event to adhere to Clean Architecture boundaries
      this.eventEmitter.emit('inheritance.disputed', witness.pewarisId);
    } else if (dto.decision === WitnessStatus.APPROVE) {
      const allWitnesses = await this.witnessRepo.findByPewarisId(
        witness.pewarisId,
      );
      const allApproved = allWitnesses.every(
        (w) => w.status === WitnessStatus.APPROVE,
      );

      if (allApproved) {
        // Trigger asset unlocking mechanism via Event
        this.eventEmitter.emit('inheritance.approved', witness.pewarisId);
      }
    }

    return { message: 'Decision submitted successfully' };
  }
}
