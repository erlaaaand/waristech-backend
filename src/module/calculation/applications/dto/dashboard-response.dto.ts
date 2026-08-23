import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '../../../assets/domains/enums/asset.enum';
import { FamilyMemberStatus } from '../../../inheritance/domains/enums/family-member.enum';

export class AssetSummaryDto {
  @ApiProperty() total: number = 0;
  @ApiProperty() verified: number = 0;
  @ApiProperty() pending: number = 0;
  @ApiProperty() rejected: number = 0;
}

export class FamilyMemberSummaryDto {
  @ApiProperty() total: number = 0;
  @ApiProperty() verified: number = 0;
  @ApiProperty() pendingConfirmation: number = 0;
  @ApiProperty() pendingVerification: number = 0;
  @ApiProperty() rejected: number = 0;
}

export class CalculationReadinessDto {
  @ApiProperty() isReadyToCalculate: boolean = false;
  @ApiProperty() reason: string = '';
}

export class DashboardResponseDto {
  @ApiProperty() pewarisId: string = '';
  @ApiProperty({ type: AssetSummaryDto }) assets: AssetSummaryDto =
    new AssetSummaryDto();
  @ApiProperty({ type: FamilyMemberSummaryDto })
  familyMembers: FamilyMemberSummaryDto = new FamilyMemberSummaryDto();
  @ApiProperty({ type: CalculationReadinessDto })
  calculationReadiness: CalculationReadinessDto = new CalculationReadinessDto();
}

export { AssetStatus, FamilyMemberStatus };
