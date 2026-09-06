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
  WitnessResponseDto,
  DeathVerificationResponseDto,
  MyFamilyMembershipResponseDto,
} from '../../applications/dto/inheritance-response.dto';
import { GenerateInvitationUseCase } from '../../applications/use-cases/generate-invitation.use-case';
import { GetMyInvitationsUseCase } from '../../applications/use-cases/get-my-invitations.use-case';
import { GetFamilyMembersUseCase } from '../../applications/use-cases/get-family-members.use-case';
import { GetPendingFamilyMembersNotarisUseCase } from '../../applications/use-cases/get-pending-family-members-notaris.use-case';
import { GetMyFamilyMembershipUseCase } from '../../applications/use-cases/get-my-family-membership.use-case';
import { ConfirmFamilyMemberUseCase } from '../../applications/use-cases/confirm-family-member.use-case';
import { VerifyFamilyMemberUseCase } from '../../applications/use-cases/verify-family-member.use-case';
import { SubmitWitnessDecisionDto } from '../../applications/dto/submit-witness-decision.dto';
import { RegisterWitnessDto } from '../../applications/dto/register-witness.dto';
import { SubmitDeathCertificateDto } from '../../applications/dto/submit-death-certificate.dto';
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
    private readonly getPendingFamilyMembersNotarisUc: GetPendingFamilyMembersNotarisUseCase,
    private readonly getMyFamilyMembershipUc: GetMyFamilyMembershipUseCase,
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

  // ── GET /inheritance/family-members/notaris/pending ───────────────────────

  @SkipThrottle()
  @Get('family-members/notaris/pending')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary:
      '(NOTARIS) Lihat antrean relasi keluarga Non-Nasab yang menunggu verifikasi',
    description:
      'Daftar seluruh relasi keluarga Non-Nasab (lintas Pewaris) berstatus ' +
      'PENDING_VERIFICATION — dipakai Notaris untuk menemukan kandidat sebelum ' +
      'memanggil PATCH .../verify atau .../reject.',
    operationId: 'inheritanceGetPendingFamilyMembersNotaris',
  })
  @ApiOkResponse({ type: [FamilyMemberResponseDto] })
  async getPendingFamilyMembersNotaris(): Promise<FamilyMemberResponseDto[]> {
    return this.getPendingFamilyMembersNotarisUc.execute();
  }

  // ── GET /inheritance/family-members/me ─────────────────────────────────────

  @SkipThrottle()
  @Get('family-members/me')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.AHLI_WARIS)
  @ApiOperation({
    summary: '(AHLI WARIS) Lihat status keanggotaan keluarga saya sendiri',
    description:
      'Menampilkan Pewaris yang mengundang Anda, hubungan keluarga, dan status ' +
      'verifikasi — pelengkap GET /inheritance/family-members yang khusus milik Pewaris.',
    operationId: 'inheritanceGetMyFamilyMembership',
  })
  @ApiOkResponse({ type: [MyFamilyMembershipResponseDto] })
  async getMyFamilyMembership(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyFamilyMembershipResponseDto[]> {
    return this.getMyFamilyMembershipUc.execute(user.sub);
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
    @Param('id', new ParseUUIDPipe()) id: string,
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
    @Param('id', new ParseUUIDPipe()) id: string,
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
    @Param('id', new ParseUUIDPipe()) id: string,
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

  // ── POST /inheritance/witnesses ─────────────────────────────────────────────

  @Post('witnesses')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Daftarkan Saksi / Kontak Darurat',
    description:
      'Pewaris mendaftarkan saksi (minimal 3 diperlukan sebelum verifikasi kematian dapat diproses) sejak masa hidup.',
    operationId: 'inheritanceRegisterWitness',
  })
  @ApiCreatedResponse({ type: WitnessResponseDto })
  async registerWitness(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterWitnessDto,
  ): Promise<WitnessResponseDto> {
    return this.orchestrator.registerWitnessForPewaris(user.sub, dto);
  }

  // ── GET /inheritance/witnesses ───────────────────────────────────────────────

  @SkipThrottle()
  @Get('witnesses')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Lihat daftar Saksi / Kontak Darurat terdaftar',
    operationId: 'inheritanceGetMyWitnesses',
  })
  @ApiOkResponse({ type: [WitnessResponseDto] })
  async getMyWitnesses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WitnessResponseDto[]> {
    return this.orchestrator.listWitnesses(user.sub);
  }

  // ── POST /inheritance/death-certificate ──────────────────────────────────────

  @Post('death-certificate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajukan dokumen akta kematian resmi',
    description:
      'Anggota keluarga mengajukan dokumen akta kematian Dukcapil (unggah dulu via POST /storage/upload, purpose: DEATH_CERTIFICATE) sebagai syarat pihak resmi/netral dalam verifikasi berjenjang.',
    operationId: 'inheritanceSubmitDeathCertificate',
  })
  @ApiCreatedResponse({ type: DeathVerificationResponseDto })
  async submitDeathCertificate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitDeathCertificateDto,
  ): Promise<DeathVerificationResponseDto> {
    return this.orchestrator.submitDeathCertificate(user.sub, dto);
  }

  // ── PATCH /inheritance/death-certificate/:id/verify ──────────────────────────

  @Patch('death-certificate/:id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Verifikasi dokumen akta kematian',
    description:
      'Notaris memverifikasi keaslian dokumen akta kematian — memenuhi syarat pihak resmi/netral sebelum brankas dapat dibuka.',
    operationId: 'inheritanceVerifyDeathCertificate',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: DeathVerificationResponseDto })
  async verifyDeathCertificate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeathVerificationResponseDto> {
    return this.orchestrator.verifyDeathCertificate(id, user.sub);
  }
}
