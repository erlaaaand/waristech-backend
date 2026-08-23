import { Injectable } from '@nestjs/common';
import { ICalculationStrategy } from '../../domains/strategies/calculation-strategy.interface';
import { FaraidhStrategy } from '../../domains/strategies/faraidh.strategy';
import { CivilStrategy } from '../../domains/strategies/civil.strategy';
import { CustomaryStrategy } from '../../domains/strategies/customary.strategy';
import { CalculationMethod } from '../../domains/enums/calculation.enum';
import { UnsupportedCalculationMethodException } from '../../domains/exceptions/calculation.exception';

@Injectable()
export class CalculationStrategyFactory {
  constructor(
    private readonly faraidhStrategy: FaraidhStrategy,
    private readonly civilStrategy: CivilStrategy,
    private readonly customaryStrategy: CustomaryStrategy,
  ) {}

  getStrategy(method: CalculationMethod): ICalculationStrategy {
    switch (method) {
      case CalculationMethod.FARAIDH:
        return this.faraidhStrategy;
      case CalculationMethod.CIVIL:
        return this.civilStrategy;
      case CalculationMethod.CUSTOMARY:
        return this.customaryStrategy;
      default:
        throw new UnsupportedCalculationMethodException();
    }
  }
}
