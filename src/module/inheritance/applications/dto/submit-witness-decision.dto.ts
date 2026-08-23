import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { WitnessStatus } from '../../domains/enums/witness.enum';

export class SubmitWitnessDecisionDto {
  @IsNotEmpty()
  @IsString()
  witnessId: string = '';

  @IsNotEmpty()
  @IsEnum(WitnessStatus)
  decision: WitnessStatus = WitnessStatus.PENDING; // Usually APPROVE or DISPUTE
}
