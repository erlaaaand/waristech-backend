import { Injectable } from '@nestjs/common';
import { SimulateCalculationDto } from '../dto/simulate-calculation.dto';
import { CalculationResponseDto } from '../dto/calculation-response.dto';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';
import { SimulateDistributionUseCase } from '../use-cases/simulate-distribution.use-case';
import { GetDashboardUseCase } from '../use-cases/get-dashboard.use-case';

@Injectable()
export class CalculationOrchestrator {
  constructor(
    private readonly simulateDistributionUc: SimulateDistributionUseCase,
    private readonly getDashboardUc: GetDashboardUseCase,
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
}
