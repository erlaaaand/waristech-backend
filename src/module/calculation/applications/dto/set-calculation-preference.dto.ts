import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CalculationMethod } from '../../domains/enums/calculation.enum';

export class SetCalculationPreferenceDto {
  @ApiProperty({
    enum: CalculationMethod,
    example: CalculationMethod.FARAIDH,
    description:
      'Skema hukum waris yang dipilih sebagai panduan pembagian aset. ' +
      'Setelah diatur, alokasi aset (POST /assets/:id/allocate) akan divalidasi terhadap skema ini.',
  })
  @IsEnum(CalculationMethod)
  @IsNotEmpty()
  method: CalculationMethod = CalculationMethod.CIVIL;
}
