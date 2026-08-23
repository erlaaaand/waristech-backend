import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AllocateAssetDto {
  @ApiProperty({ example: 'uuid-ahli-waris' })
  @IsUUID()
  @IsNotEmpty()
  ahliWarisId!: string;

  @ApiProperty({ example: 50, description: 'Percentage allocation (1-100)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsNotEmpty()
  percentage!: number;

  @ApiProperty({
    example: false,
    description: 'Menunjuk Ahli Waris ini sebagai Eksekutor pencairan',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isExecutor?: boolean;
}
