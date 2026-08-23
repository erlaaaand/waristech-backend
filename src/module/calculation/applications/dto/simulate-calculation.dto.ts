import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CalculationMethod } from '../../domains/enums/calculation.enum';

export class CustomaryRatioDto {
  @ApiProperty({ description: 'ID Ahli Waris' })
  @IsString()
  @IsNotEmpty()
  ahliWarisId: string = '';

  @ApiProperty({ description: 'Persentase porsi (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  ratioPercentage: number = 0;
}

export class SimulateCalculationDto {
  @ApiProperty({
    enum: CalculationMethod,
    description: 'Pilih metode hukum waris yang ingin disimulasikan.',
    example: CalculationMethod.FARAIDH,
  })
  @IsEnum(CalculationMethod)
  @IsNotEmpty()
  method: CalculationMethod = CalculationMethod.FARAIDH;

  @ApiPropertyOptional({
    description: 'Wajib diisi jika method CUSTOMARY, mengatur rasio per orang.',
    type: [CustomaryRatioDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomaryRatioDto)
  customaryRatios?: CustomaryRatioDto[];
}
