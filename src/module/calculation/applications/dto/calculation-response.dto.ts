import { ApiProperty } from '@nestjs/swagger';
import { CalculationMethod } from '../../domains/enums/calculation.enum';

export class ShareDetailResponseDto {
  @ApiProperty() ahliWarisId: string = '';
  @ApiProperty() relationshipDescription: string = '';
  @ApiProperty() ratio: string = '';
  @ApiProperty() calculatedPercentage: number = 0;
}

export class CalculationResponseDto {
  @ApiProperty() id?: string;
  @ApiProperty() pewarisId: string = '';
  @ApiProperty({ enum: CalculationMethod }) method: CalculationMethod =
    CalculationMethod.FARAIDH;
  @ApiProperty() baseUnit: number = 0;
  @ApiProperty({ type: [ShareDetailResponseDto] })
  shares: ShareDetailResponseDto[] = [];
  @ApiProperty() createdAt?: Date;
}
