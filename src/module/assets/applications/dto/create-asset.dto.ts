import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType, AssetCustodyType } from '../../domains/enums/asset.enum';

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

  @ApiPropertyOptional({
    enum: AssetCustodyType,
    default: AssetCustodyType.VAULT,
    description:
      '`VAULT` — kredensial dititipkan & dipecah Shamir 2-dari-3 (default).\n' +
      '`GUIDANCE` — kredensial TIDAK disimpan; sistem hanya menyediakan panduan dokumen & ' +
      'langkah resmi bagi ahli waris. Disarankan untuk REKENING_BANK dan ASURANSI_JIWA, ' +
      'karena menyerahkan PIN/password lembaga resmi umumnya melanggar syarat & ketentuan mereka.',
  })
  @IsEnum(AssetCustodyType)
  @IsOptional()
  custodyType?: AssetCustodyType;

  @ApiPropertyOptional({
    type: VaultSecretDto,
    description:
      'Kunci rahasia terstruktur (username, password, PIN, catatan). ' +
      'WAJIB bila `custodyType` = VAULT; abaikan bila GUIDANCE.',
  })
  @ValidateIf(
    (o: CreateAssetDto) => o.custodyType !== AssetCustodyType.GUIDANCE,
  )
  @ValidateNested()
  @Type(() => VaultSecretDto)
  @IsNotEmpty({
    message:
      'secret wajib diisi untuk aset custodyType VAULT. Gunakan custodyType GUIDANCE bila kredensial tidak ingin dititipkan.',
  })
  secret?: VaultSecretDto;
}
