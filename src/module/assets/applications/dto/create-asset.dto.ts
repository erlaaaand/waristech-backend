import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '../../domains/enums/asset.enum';

export class VaultSecretDto {
  @ApiProperty({ example: 'john_doe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  username?: string;

  @ApiProperty({ example: 'MySecretPassword123', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(512)
  password?: string;

  @ApiProperty({ example: '123456', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  pin?: string;

  @ApiProperty({ example: 'Rekening utama, jangan lupa 2FA', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class CreateAssetDto {
  @ApiProperty({ enum: AssetType })
  @IsEnum(AssetType)
  @IsNotEmpty()
  type!: AssetType;

  @ApiProperty({ example: 'Tabungan Pensiun BCA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  assetName!: string;

  @ApiProperty({ example: 'BCA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  platform!: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  accountIdentifier!: string;

  @ApiProperty({
    type: VaultSecretDto,
    description: 'Kunci rahasia terstruktur (username, password, PIN, catatan)',
  })
  @ValidateNested()
  @Type(() => VaultSecretDto)
  @IsNotEmpty()
  secret!: VaultSecretDto;
}
