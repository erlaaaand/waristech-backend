import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/auth/interface/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/interface/guards/roles.guard';
import { Roles } from '../../../identity/auth/interface/decorators/roles.decorator';
import { CurrentUser } from '../../../identity/auth/interface/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../identity/auth/domains/entities/jwt-payload.entity';
import { UserRole } from '../../../identity/users/domains/entities/user.entity';
import { InheritanceExceptionFilter } from '../../interface/filters/inheritance-exception.filter';
import { GenerateInvitationDto } from '../../applications/dto/generate-invitation.dto';
import {
  FamilyMemberResponseDto,
  InvitationResponseDto,
} from '../../applications/dto/inheritance-response.dto';
import { GenerateInvitationUseCase } from '../../applications/use-cases/generate-invitation.use-case';
import { GetMyInvitationsUseCase } from '../../applications/use-cases/get-my-invitations.use-case';
import { GetFamilyMembersUseCase } from '../../applications/use-cases/get-family-members.use-case';
import { ConfirmFamilyMemberUseCase } from '../../applications/use-cases/confirm-family-member.use-case';
import { VerifyFamilyMemberUseCase } from '../../applications/use-cases/verify-family-member.use-case';
import { SubmitWitnessDecisionDto } from '../../applications/dto/submit-witness-decision.dto';
import { InheritanceOrchestrator } from '../../applications/orchestrator/inheritance.orchestrator';

@ApiTags('Inheritance - Waris')
@ApiBearerAuth('JWT')
@Controller('inheritance')
@UseFilters(InheritanceExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
export class InheritanceController {
  constructor(
    private readonly generateInvitationUc: GenerateInvitationUseCase,
    private readonly getMyInvitationsUc: GetMyInvitationsUseCase,
    private readonly getFamilyMembersUc: GetFamilyMembersUseCase,
    private readonly confirmFamilyMemberUc: ConfirmFamilyMemberUseCase,
    private readonly verifyFamilyMemberUc: VerifyFamilyMemberUseCase,
    private readonly orchestrator: InheritanceOrchestrator,
  ) {}

  // ── POST /inheritance/invitations ──────────────────────────────────────────

  @Throttle({ dashboard: {} })
  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Buat kode undangan untuk Ahli Waris',
    description:
      'Pewaris membuat kode undangan unik yang dapat dibagikan ke calon Ahli Waris. Kode berlaku 7 hari.',
    operationId: 'inheritanceGenerateInvitation',
  })
  @ApiCreatedResponse({ type: InvitationResponseDto })
  @ApiForbiddenResponse({
    description: 'Hanya Pewaris yang dapat membuat undangan.',
  })
  async generateInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateInvitationDto,
  ): Promise<InvitationResponseDto> {
    return this.generateInvitationUc.execute(user.sub, dto);
  }

  // ── GET /inheritance/invitations ───────────────────────────────────────────

  @SkipThrottle()
  @Get('invitations')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Lihat semua kode undangan milik saya',
    operationId: 'inheritanceGetMyInvitations',
  })
  @ApiOkResponse({ type: [InvitationResponseDto] })
  async getMyInvitations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvitationResponseDto[]> {
    return this.getMyInvitationsUc.execute(user.sub);
  }

  // ── GET /inheritance/family-members ───────────────────────────────────────

  @SkipThrottle()
  @Get('family-members')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Lihat daftar anggota keluarga (Ahli Waris)',
    operationId: 'inheritanceGetFamilyMembers',
  })
  @ApiOkResponse({ type: [FamilyMemberResponseDto] })
  async getFamilyMembers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FamilyMemberResponseDto[]> {
    return this.getFamilyMembersUc.execute(user.sub);
  }

  // ── PATCH /inheritance/family-members/:id/confirm ─────────────────────────

  @Patch('family-members/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Konfirmasi anggota keluarga',
    description:
      'Pewaris mengkonfirmasi bahwa Ahli Waris yang mendaftar merupakan anggota keluarga yang sah (untuk relasi NASAB).',
    operationId: 'inheritanceConfirmFamilyMember',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: FamilyMemberResponseDto })
  @ApiNotFoundResponse({
    description: 'Data anggota keluarga tidak ditemukan.',
  })
  async confirmFamilyMember(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FamilyMemberResponseDto> {
    return this.confirmFamilyMemberUc.execute(id, user.sub);
  }

  // ── PATCH /inheritance/family-members/:id/verify ──────────────────────────

  @Patch('family-members/:id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Verifikasi relasi keluarga Non-Nasab',
    description:
      'Notaris memverifikasi dokumen pendukung dan menyetujui relasi keluarga Non-Nasab.',
    operationId: 'inheritanceVerifyFamilyMember',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: FamilyMemberResponseDto })
  async verifyFamilyMember(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FamilyMemberResponseDto> {
    return this.verifyFamilyMemberUc.verify(id, user.sub);
  }

  // ── PATCH /inheritance/family-members/:id/reject ──────────────────────────

  @Patch('family-members/:id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Tolak relasi keluarga Non-Nasab',
    description:
      'Notaris menolak dokumen pendukung dan menolak relasi keluarga Non-Nasab.',
    operationId: 'inheritanceRejectFamilyMember',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: FamilyMemberResponseDto })
  async rejectFamilyMember(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FamilyMemberResponseDto> {
    return this.verifyFamilyMemberUc.reject(id, user.sub);
  }

  // ── POST /inheritance/witness/decision ────────────────────────────────────

  @Post('witness/decision')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GUEST)
  @ApiOperation({
    summary: '(GUEST) Submit Keputusan Saksi',
    description:
      'Saksi menyetujui (APPROVE) atau menyanggah (DISPUTE) pembagian warisan.',
    operationId: 'inheritanceSubmitWitnessDecision',
  })
  @ApiOkResponse({ description: 'Keputusan berhasil disimpan.' })
  async submitWitnessDecision(
    @Body() dto: SubmitWitnessDecisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.orchestrator.submitDecision(dto, user.sub);
  }
}
