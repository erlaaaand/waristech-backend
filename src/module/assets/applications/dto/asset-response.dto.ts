import { ApiProperty } from '@nestjs/swagger';
import { AssetType, AssetStatus } from '../../domains/enums/asset.enum';

export class AssetAllocationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() assetId!: string;
  @ApiProperty() ahliWarisId!: string;
  @ApiProperty() percentage!: number;
  @ApiProperty() isExecutor!: boolean;
  @ApiProperty({ nullable: true }) acknowledgedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class AssetResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() pewarisId!: string;
  @ApiProperty({ enum: AssetType }) type!: AssetType;
  @ApiProperty() assetName!: string;
  @ApiProperty() platform!: string;
  @ApiProperty() accountIdentifier!: string;
  // encryptedSecret is NOT returned here for security
  @ApiProperty({ enum: AssetStatus }) status!: AssetStatus;
  @ApiProperty({ nullable: true }) verifiedByNotarisId!: string | null;
  @ApiProperty({ nullable: true }) verifiedAt!: Date | null;
  @ApiProperty({ type: [AssetAllocationResponseDto] })
  allocations!: AssetAllocationResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
