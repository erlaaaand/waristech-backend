import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/auth/interface/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/interface/guards/roles.guard';
import { Roles } from '../../../identity/auth/interface/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/auth/interface/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../identity/auth/domains/entities/jwt-payload.entity';
import { UserRole } from '../../../identity/users/domains/entities/user.entity';
import { CheckInUseCase } from '../../applications/use-cases/check-in.use-case';
import { GetStatusUseCase } from '../../applications/use-cases/get-status.use-case';
import { ProofOfLifeStatusDto } from '../../applications/dto/proof-of-life-status.dto';

@ApiTags('Proof-of-Life')
@ApiBearerAuth('JWT')
@Controller('proof-of-life')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProofOfLifeController {
  constructor(
    private readonly checkInUc: CheckInUseCase,
    private readonly getStatusUc: GetStatusUseCase,
  ) {}

  // ── GET /proof-of-life/status ─────────────────────────────────────────────

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Lihat status Proof-of-Life saya',
    description:
      'Menampilkan waktu check-in terakhir, tahap saat ini, dan sisa hari sebelum ' +
      'jatuh tempo check-in berikutnya.',
    operationId: 'proofOfLifeGetStatus',
  })
  @ApiOkResponse({ type: ProofOfLifeStatusDto })
  async getStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProofOfLifeStatusDto> {
    return this.getStatusUc.execute(user.sub);
  }

  // ── POST /proof-of-life/check-in ─────────────────────────────────────────────

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Konfirmasi status aktif ("Check-in")',
    description:
      'Pewaris mengonfirmasi status aktif secara berkala (idealnya setiap ≤30 hari) ' +
      'untuk mencegah sistem memicu proses verifikasi kematian secara keliru.',
    operationId: 'proofOfLifeCheckIn',
  })
  @ApiOkResponse({ description: 'Check-in berhasil dicatat.' })
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.checkInUc.execute(user.sub);
  }
}
