import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
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
import { SetCalculationPreferenceDto } from '../../applications/dto/set-calculation-preference.dto';
import { CalculationMethod } from '../../domains/enums/calculation.enum';
import { CalculationOrchestrator } from '../../applications/orchestrator/calculation.orchestrator';
import { Audit } from '../../../shared/audit/decorators/audit.decorator';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

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

  // ── PATCH /calculation/preference ───────────────────────────────────────────

  @Patch('preference')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Tetapkan Skema Hukum Waris Pilihan',
    description:
      'Skema yang dipilih di sini akan dipakai sebagai acuan validasi saat Pewaris ' +
      'mengalokasikan aset (POST /assets/:id/allocate) ke ahli waris.',
    operationId: 'calculationSetPreference',
  })
  @ApiOkResponse({
    schema: {
      example: { preferredCalculationMethod: 'FARAIDH' },
    },
  })
  @Audit({
    action: AuditAction.USER_UPDATE,
    category: AuditCategory.WARIS_CALCULATION,
    severity: AuditSeverity.INFO,
    resource: 'CalculationPreference',
    description: 'Pewaris menetapkan preferensi skema hukum waris',
  })
  setPreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetCalculationPreferenceDto,
  ): Promise<{ preferredCalculationMethod: CalculationMethod }> {
    return this.orchestrator.setPreference(user.sub, dto);
  }

  // ── GET /calculation/preference ─────────────────────────────────────────────

  @SkipThrottle()
  @Get('preference')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Lihat Skema Hukum Waris Pilihan Saat Ini',
    operationId: 'calculationGetPreference',
  })
  @ApiOkResponse({
    schema: {
      example: { preferredCalculationMethod: 'FARAIDH' },
    },
  })
  getPreference(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ preferredCalculationMethod: CalculationMethod | null }> {
    return this.orchestrator.getPreference(user.sub);
  }
}
