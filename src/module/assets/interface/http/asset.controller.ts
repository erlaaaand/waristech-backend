import {
  Body,
  Controller,
  Delete,
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
import { AssetExceptionFilter } from '../filters/asset-exception.filter';
import { CreateAssetDto } from '../../applications/dto/create-asset.dto';
import { UpdateAssetDto } from '../../applications/dto/update-asset.dto';
import {
  AssetResponseDto,
  AssetAllocationResponseDto,
} from '../../applications/dto/asset-response.dto';
import { AllocateAssetDto } from '../../applications/dto/allocate-asset.dto';
import { UploadLiquidationProofDto } from '../../applications/dto/upload-liquidation-proof.dto';
import { AssetOrchestrator } from '../../applications/orchestrator/asset.orchestrator';

@ApiTags('Assets - Harta Warisan')
@ApiBearerAuth('JWT')
@Controller('assets')
@UseFilters(AssetExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetController {
  constructor(private readonly orchestrator: AssetOrchestrator) {}

  // ── POST /assets ─────────────────────────────────────────────────────────

  @Throttle({ dashboard: {} })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Tambah Harta Warisan Baru',
    description: 'Pewaris mendaftarkan harta (aset) ke dalam sistem.',
    operationId: 'assetsCreate',
  })
  @ApiCreatedResponse({ type: AssetResponseDto })
  @ApiForbiddenResponse({
    description: 'Hanya Pewaris yang dapat menambahkan harta.',
  })
  createAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.orchestrator.createAsset(user.sub, dto);
  }

  // ── GET /assets ──────────────────────────────────────────────────────────

  @SkipThrottle()
  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Lihat Daftar Harta Warisan',
    operationId: 'assetsListMyAssets',
  })
  @ApiOkResponse({ type: [AssetResponseDto] })
  listMyAssets(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssetResponseDto[]> {
    return this.orchestrator.listMyAssets(user.sub);
  }

  // ── GET /assets/notaris/pending ──────────────────────────────────────────

  @SkipThrottle()
  @Get('notaris/pending')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Lihat Daftar Harta Warisan Menunggu Verifikasi',
    operationId: 'assetsListPendingNotaris',
  })
  @ApiOkResponse({ type: [AssetResponseDto] })
  listPendingForNotaris(): Promise<AssetResponseDto[]> {
    return this.orchestrator.listPendingForNotaris();
  }

  // ── GET /assets/notaris/history ──────────────────────────────────────────

  @SkipThrottle()
  @Get('notaris/history')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Lihat Riwayat Verifikasi',
    operationId: 'assetsListHistoryNotaris',
  })
  @ApiOkResponse({ type: [AssetResponseDto] })
  listHistoryForNotaris(): Promise<AssetResponseDto[]> {
    return this.orchestrator.listHistoryForNotaris();
  }

  // ── GET /assets/ahli-waris/allocated ─────────────────────────────────────

  @SkipThrottle()
  @Get('ahli-waris/allocated')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.AHLI_WARIS)
  @ApiOperation({
    summary: '(AHLI WARIS) Lihat Daftar Harta Warisan Dialokasikan',
    operationId: 'assetsListAllocatedAhliWaris',
  })
  @ApiOkResponse({ type: [AssetResponseDto] })
  listAllocatedForAhliWaris(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssetResponseDto[]> {
    return this.orchestrator.listAllocatedForAhliWaris(user.sub);
  }

  // ── PATCH /assets/:id ────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Perbarui Harta Warisan',
    description:
      'Pewaris mengupdate detail harta (hanya bisa jika statusnya belum diverifikasi Notaris).',
    operationId: 'assetsUpdate',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'Aset tidak ditemukan.' })
  updateAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.orchestrator.updateAsset(id, user.sub, dto);
  }

  // ── DELETE /assets/:id ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Hapus Harta Warisan',
    description:
      'Pewaris menghapus harta (hanya bisa jika statusnya belum diverifikasi Notaris).',
    operationId: 'assetsDelete',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  deleteAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.orchestrator.deleteAsset(id, user.sub);
  }

  // ── PATCH /assets/:id/verify ─────────────────────────────────────────────

  @Patch(':id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Verifikasi Harta Warisan',
    description:
      'Notaris memverifikasi harta pewaris berdasarkan dokumen pendukung.',
    operationId: 'assetsVerify',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: AssetResponseDto })
  verifyAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssetResponseDto> {
    return this.orchestrator.verifyAsset(id, user.sub);
  }

  // ── PATCH /assets/:id/reject ─────────────────────────────────────────────

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Tolak Harta Warisan',
    description: 'Notaris menolak verifikasi harta pewaris.',
    operationId: 'assetsReject',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: AssetResponseDto })
  rejectAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssetResponseDto> {
    return this.orchestrator.rejectAsset(id, user.sub);
  }

  // ── POST /assets/:id/allocate ────────────────────────────────────────────

  @Post(':id/allocate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Alokasikan Harta Warisan',
    description:
      'Pewaris mengalokasikan persentase aset digital kepada ahli waris tertentu.',
    operationId: 'assetsAllocate',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: AssetAllocationResponseDto })
  allocateAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AllocateAssetDto,
  ): Promise<AssetAllocationResponseDto> {
    return this.orchestrator.allocateAsset(user.sub, id, dto);
  }

  // ── GET /assets/:id/secret (Membuka Brankas) ───────────────────────────

  @Get(':id/secret')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.AHLI_WARIS)
  @ApiOperation({
    summary: '(AHLI WARIS) Buka Brankas Aset',
    description:
      'Eksekutor melihat plaintext kunci. Ahli Waris biasa hanya melihat info aset tanpa rahasia.',
    operationId: 'assetsUnlock',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Rahasia aset berhasil didapatkan' })
  unlockAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orchestrator.unlockAsset(id, user.sub);
  }

  // ── POST /assets/:id/liquidation-proof (Upload Bukti Pencairan) ────────

  @Post(':id/liquidation-proof')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.AHLI_WARIS)
  @ApiOperation({
    summary: '(EKSEKUTOR) Upload Bukti Pencairan e-Statement',
    description:
      'Eksekutor mengunggah PDF e-Statement bank sebagai bukti pencairan. Wajib menyetujui SPTJM.',
    operationId: 'assetsUploadProof',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Bukti pencairan berhasil diunggah' })
  uploadLiquidationProof(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadLiquidationProofDto,
  ) {
    return this.orchestrator.uploadLiquidationProof(id, user.sub, dto);
  }

  // ── POST /assets/:id/acknowledge (Konfirmasi Penerimaan Dana) ──────────

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.AHLI_WARIS)
  @ApiOperation({
    summary: '(AHLI WARIS) Konfirmasi Penerimaan Dana',
    description:
      'Ahli Waris non-Eksekutor mengonfirmasi bahwa dana warisan telah diterima.',
    operationId: 'assetsAcknowledge',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Konfirmasi penerimaan dicatat' })
  acknowledgeDistribution(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orchestrator.acknowledgeDistribution(id, user.sub);
  }

  // ── PATCH /assets/:id/close (Notaris Tutup Kasus) ──────────────────────

  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Tutup Kasus & Hapus Data Rahasia',
    description:
      'Notaris menutup kasus warisan secara final. Data encryptedSecret akan dihancurkan (cryptographic wipe).',
    operationId: 'assetsClose',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Kasus berhasil ditutup dan data dihancurkan' })
  closeAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orchestrator.closeAsset(id, user.sub);
  }
}
