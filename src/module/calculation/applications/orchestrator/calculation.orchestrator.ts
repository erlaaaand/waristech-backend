import { Injectable } from '@nestjs/common';
import { SimulateCalculationDto } from '../dto/simulate-calculation.dto';
import { CalculationResponseDto } from '../dto/calculation-response.dto';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';
import { SimulateDistributionUseCase } from '../use-cases/simulate-distribution.use-case';
import { GetDashboardUseCase } from '../use-cases/get-dashboard.use-case';
import { SetCalculationPreferenceUseCase } from '../use-cases/set-calculation-preference.use-case';
import { SetCalculationPreferenceDto } from '../dto/set-calculation-preference.dto';
import { GetCalculationPreferenceUseCase } from '../use-cases/get-calculation-preference.use-case';
import { CalculationMethod } from '../../domains/enums/calculation.enum';

@Injectable()
export class CalculationOrchestrator {
  constructor(
    private readonly simulateDistributionUc: SimulateDistributionUseCase,
    private readonly getDashboardUc: GetDashboardUseCase,
    private readonly setCalculationPreferenceUc: SetCalculationPreferenceUseCase,
    private readonly getCalculationPreferenceUc: GetCalculationPreferenceUseCase,
  ) {}

  simulate(
    pewarisId: string,
    dto: SimulateCalculationDto,
  ): Promise<CalculationResponseDto> {
    return this.simulateDistributionUc.execute(pewarisId, dto);
  }

  getDashboard(pewarisId: string): Promise<DashboardResponseDto> {
    return this.getDashboardUc.execute(pewarisId);
  }

  setPreference(
    pewarisId: string,
    dto: SetCalculationPreferenceDto,
  ): Promise<{ preferredCalculationMethod: CalculationMethod }> {
    return this.setCalculationPreferenceUc.execute(pewarisId, dto);
  }

  getPreference(
    pewarisId: string,
  ): Promise<{ preferredCalculationMethod: CalculationMethod | null }> {
    return this.getCalculationPreferenceUc.execute(pewarisId);
  }
}
