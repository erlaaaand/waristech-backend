import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../identity/auth/interface/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../identity/auth/interface/guards/roles.guard';
import { Roles } from '../../../../identity/auth/interface/decorators/roles.decorator';
import { CurrentUser } from '../../../../identity/auth/interface/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../identity/auth/domains/entities/jwt-payload.entity';
import { UserRole } from '../../../../identity/users/domains/entities/user.entity';
import { ReportDataBreachDto } from '../../applications/dto/report-data-breach.dto';
import { ReportDataBreachUseCase } from '../../applications/use-cases/report-data-breach.use-case';
import {
  GetMyConsentUseCase,
  type MyConsentResponse,
} from '../../applications/use-cases/get-my-consent.use-case';
import { GrantConsentUseCase } from '../../applications/use-cases/grant-consent.use-case';

@ApiTags('Compliance - Pelindungan Data Pribadi (UU PDP)')
@ApiBearerAuth('JWT')
@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(
    private readonly reportDataBreachUc: ReportDataBreachUseCase,
    private readonly getMyConsentUc: GetMyConsentUseCase,
    private readonly grantConsentUc: GrantConsentUseCase,
  ) {}

  // ── GET /compliance/consent ─────────────────────────────────────────────────

  @SkipThrottle()
  @Get('consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lihat status persetujuan pemrosesan data pribadi saya',
    description:
      'Menampilkan kapan persetujuan diberikan, versi kebijakan yang disetujui, ' +
      'dan apakah masih sesuai dengan versi kebijakan yang berlaku saat ini.',
    operationId: 'complianceGetMyConsent',
  })
  @ApiOkResponse({
    schema: {
      example: {
        hasGivenConsent: true,
        consentGivenAt: '2026-08-28T10:00:00.000Z',
        consentVersion: 'v1.0',
        currentPolicyVersion: 'v1.0',
        isUpToDate: true,
      },
    },
  })
  getMyConsent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyConsentResponse> {
    return this.getMyConsentUc.execute(user.sub);
  }

  // ── POST /compliance/consent ────────────────────────────────────────────────

  @Post('consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Berikan / perbarui persetujuan pemrosesan data pribadi',
    description:
      'Dipakai saat versi kebijakan privasi berubah dan pengguna perlu menyetujui ulang ' +
      '(UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi).',
    operationId: 'complianceGrantConsent',
  })
  @ApiOkResponse({
    schema: {
      example: {
        consentGivenAt: '2026-08-28T10:00:00.000Z',
        consentVersion: 'v1.0',
      },
    },
  })
  grantConsent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ consentGivenAt: Date; consentVersion: string }> {
    return this.grantConsentUc.execute(user.sub);
  }

  // ── POST /compliance/data-breach ────────────────────────────────────────────

  @Throttle({ strict: {} })
  @Post('data-breach')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '(ADMIN) Laporkan insiden kegagalan pelindungan data',
    description:
      'Mencatat insiden ke audit trail (severity CRITICAL, permanen) dan memberitahu ' +
      'seluruh pengguna terdampak — memenuhi kewajiban pemberitahuan insiden UU PDP.',
    operationId: 'complianceReportDataBreach',
  })
  @ApiCreatedResponse({
    schema: {
      example: {
        message:
          'Insiden tercatat di audit trail. 2 pengguna terdampak telah diberitahu.',
        notifiedUserCount: 2,
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Akses ditolak. Hanya untuk Admin.' })
  reportDataBreach(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReportDataBreachDto,
  ): Promise<{ message: string; notifiedUserCount: number }> {
    return this.reportDataBreachUc.execute(user.sub, dto);
  }
}
