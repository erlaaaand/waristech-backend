import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/auth/interface/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/interface/guards/roles.guard';
import { Roles } from '../../../identity/auth/interface/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/auth/interface/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../identity/auth/domains/entities/jwt-payload.entity';
import { UserRole } from '../../../identity/users/domains/entities/user.entity';
import { CalculationExceptionFilter } from '../filters/calculation-exception.filter';
import { SimulateCalculationDto } from '../../applications/dto/simulate-calculation.dto';
import { CalculationResponseDto } from '../../applications/dto/calculation-response.dto';
import { DashboardResponseDto } from '../../applications/dto/dashboard-response.dto';
import { CalculationOrchestrator } from '../../applications/orchestrator/calculation.orchestrator';

@ApiTags('Calculation - Kalkulator Waris')
@ApiBearerAuth('JWT')
@Controller('calculation')
@UseFilters(CalculationExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalculationController {
  constructor(private readonly orchestrator: CalculationOrchestrator) {}

  @Throttle({ dashboard: {} })
  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Simulasi Perhitungan Harta Waris',
    description:
      'Menghitung secara on-the-fly pembagian porsi ahli waris berdasarkan metode hukum yang dipilih.',
    operationId: 'calculationSimulate',
  })
  @ApiOkResponse({ type: CalculationResponseDto })
  @ApiForbiddenResponse({
    description: 'Hanya Pewaris yang dapat mensimulasikan harta.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Data aset atau ahli waris tidak memadai.',
  })
  simulate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SimulateCalculationDto,
  ): Promise<CalculationResponseDto> {
    return this.orchestrator.simulate(user.sub, dto);
  }

  @SkipThrottle()
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Dashboard Ringkasan Harta & Ahli Waris',
    description:
      'Merangkum jumlah aset, anggota keluarga, dan kesiapan kalkulasi pembagian waris.',
    operationId: 'calculationDashboard',
  })
  @ApiOkResponse({ type: DashboardResponseDto })
  getDashboard(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardResponseDto> {
    return this.orchestrator.getDashboard(user.sub);
  }
}
