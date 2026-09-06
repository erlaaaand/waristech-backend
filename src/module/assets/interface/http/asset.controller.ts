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
  ApiConflictResponse,
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
import { CloseAssetDto } from '../../applications/dto/close-asset.dto';
import { CreateAssetResponseDto } from '../../applications/dto/create-asset-response.dto';
import { EscrowNotarisShareDto } from '../../applications/dto/escrow-notaris-share.dto';
import { RotateKeySharesDto } from '../../applications/dto/rotate-key-shares.dto';
import { RejectAssetDto } from '../../applications/dto/reject-asset.dto';
import { RequestLegalFallbackDto } from '../../applications/dto/request-legal-fallback.dto';
import { ReviewLiquidationProofDto } from '../../applications/dto/review-liquidation-proof.dto';
import { LiquidationProofResponseDto } from '../../applications/dto/liquidation-proof-response.dto';
import { AssetOrchestrator } from '../../applications/orchestrator/asset.orchestrator';
import { Audit } from '../../../shared/audit/decorators/audit.decorator';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../shared/audit/domains/enums/audit.enum';

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
    description:
      'Pewaris mendaftarkan harta (aset) ke dalam sistem. Kredensial aset dipecah menjadi ' +
      '3 bagian kunci (Shamir 2-dari-3).\n\n' +
      '**PENTING:** response memuat `executorShare` dan `notarisShare` — ini SATU-SATUNYA ' +
      'kesempatan menerimanya. Server hanya menyimpan bagian SYSTEM, sehingga tidak pernah ' +
      'memiliki cukup bahan untuk membuka brankas sendirian. Simpan kedua bagian tersebut di ' +
      'penyimpanan aman perangkat; nilai tersebut tidak dapat diminta ulang.',
    operationId: 'assetsCreate',
  })
  @ApiCreatedResponse({ type: CreateAssetResponseDto })
  @ApiForbiddenResponse({
    description: 'Hanya Pewaris yang dapat menambahkan harta.',
  })
  @Audit({
    action: AuditAction.ASSET_CREATED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Pewaris mendaftarkan harta warisan baru',
  })
  createAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetDto,
  ): Promise<CreateAssetResponseDto> {
    return this.orchestrator.createAsset(user.sub, dto);
  }

  // ── POST /assets/:id/notaris-share (Titip Bagian Kunci Notaris) ─────────

  @Post(':id/notaris-share')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Titipkan bagian kunci Notaris (terenkripsi)',
    description:
      'Ambil public key Notaris via GET /users/notaris/:id/public-key, enkripsi `notarisShare` ' +
      'DI SISI KLIEN dengan kunci tersebut, lalu kirim ciphertext-nya ke sini. Server menyimpan ' +
      'ciphertext yang tidak dapat ia buka — hanya Notaris pemegang private key yang bisa.',
    operationId: 'assetsEscrowNotarisShare',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Bagian kunci Notaris berhasil dititipkan.',
  })
  @Audit({
    action: AuditAction.NOTARIS_SHARE_ESCROWED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Penitipan bagian kunci Notaris (terenkripsi)',
  })
  escrowNotarisShare(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EscrowNotarisShareDto,
  ): Promise<{ message: string }> {
    return this.orchestrator.escrowNotarisShare(user.sub, id, dto);
  }

  // ── POST /assets/:id/rotate-shares (Rotasi Kunci Berkala) ───────────────

  @Post(':id/rotate-shares')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS)
  @ApiOperation({
    summary: '(PEWARIS) Rotasi bagian kunci aset',
    description:
      'Mitigasi risiko: mengganti seluruh bagian kunci agar bagian lama yang mungkin bocor ' +
      'menjadi tidak berguna.\n\n' +
      'Alurnya digerakkan klien — server tidak bisa merekonstruksi kredensial: (1) klien ' +
      'menggabungkan bagian kunci yang ia pegang, (2) memecah ulang rahasia menjadi 3 bagian ' +
      'baru, (3) mengirim bagian SYSTEM yang baru ke sini. Simpan bagian Eksekutor yang BARU — ' +
      'bagian lama langsung tidak berlaku.',
    operationId: 'assetsRotateKeyShares',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Bagian kunci berhasil dirotasi.' })
  @Audit({
    action: AuditAction.KEY_SHARES_ROTATED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Rotasi bagian kunci aset',
  })
  rotateKeyShares(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RotateKeySharesDto,
  ): Promise<{ message: string; rotatedAt: Date }> {
    return this.orchestrator.rotateKeyShares(user.sub, id, dto);
  }

  // ── POST /assets/:id/legal-fallback (Jalur Hukum Konvensional) ──────────

  @Post(':id/legal-fallback')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS, UserRole.AHLI_WARIS)
  @ApiOperation({
    summary: 'Ajukan jalur pemulihan lewat hukum konvensional',
    description:
      'Dipakai bila kunci digital tidak dapat direkonstruksi (mis. perangkat Eksekutor hilang). ' +
      'Endpoint ini TIDAK memulihkan kunci — bila bagian tersisa kurang dari 2, kredensial ' +
      'memang tidak dapat dipulihkan siapa pun (konsekuensi matematis skema Shamir). Yang ' +
      'diberikan adalah panduan jalur resmi (Surat Keterangan Waris + prosedur lembaga), dan ' +
      'permohonan dicatat di audit trail sebagai bukti pendukung proses hukum.',
    operationId: 'assetsRequestLegalFallback',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Permohonan tercatat beserta panduan jalur resmi.',
  })
  @Audit({
    action: AuditAction.LEGAL_FALLBACK_REQUESTED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.WARNING,
    resource: 'Asset',
    description: 'Pengajuan jalur hukum konvensional',
  })
  requestLegalFallback(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestLegalFallbackDto,
  ) {
    return this.orchestrator.requestLegalFallback(id, user.sub, dto);
  }

  // ── GET /assets/:id/guidance (Panduan Proses Resmi) ─────────────────────

  @SkipThrottle()
  @Get(':id/guidance')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PEWARIS, UserRole.AHLI_WARIS)
  @ApiOperation({
    summary: 'Panduan dokumen & langkah resmi (aset berkustodi GUIDANCE)',
    description:
      'Untuk aset yang kredensialnya sengaja TIDAK dititipkan ke sistem (mis. rekening bank, ' +
      'asuransi jiwa), endpoint ini memberi daftar dokumen yang perlu disiapkan, langkah teknis ' +
      'di lembaga terkait, dan dasar hukumnya. Dapat diakses Pewaris pemilik maupun Ahli Waris ' +
      'yang dialokasikan aset ini.',
    operationId: 'assetsGetGuidance',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Panduan berhasil diambil.' })
  getAssetGuidance(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orchestrator.getAssetGuidance(id, user.sub);
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
  listPendingForNotaris(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssetResponseDto[]> {
    return this.orchestrator.listPendingForNotaris(user.sub);
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
  listHistoryForNotaris(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssetResponseDto[]> {
    return this.orchestrator.listHistoryForNotaris(user.sub);
  }

  // ── GET /assets/notaris/liquidation-reviews ──────────────────────────────

  @SkipThrottle()
  @Get('notaris/liquidation-reviews')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Lihat Bukti Pencairan yang Menunggu Tinjauan',
    description:
      'Keabsahan bukti pencairan (e-Statement) ditentukan manual oleh Notaris, ' +
      'bukan oleh sistem otomatis. Buka `pdfFileUrl` (gunakan `pdfPassword` bila terkunci) ' +
      'lalu putuskan lewat PATCH /assets/liquidation-proofs/:proofId/review.',
    operationId: 'assetsListPendingLiquidationReviews',
  })
  @ApiOkResponse({ type: [LiquidationProofResponseDto] })
  listPendingLiquidationReviews(): Promise<LiquidationProofResponseDto[]> {
    return this.orchestrator.listPendingLiquidationReviews();
  }

  // ── PATCH /assets/liquidation-proofs/:proofId/review ─────────────────────

  @Patch('liquidation-proofs/:proofId/review')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Tinjau & Putuskan Bukti Pencairan',
    description:
      'APPROVE memindahkan aset ke DISTRIBUTED. REJECT mengeskalasi ke DISPUTED_LIQUIDATION ' +
      'dan wajib disertai alasan tertulis — dicatat ke audit trail dan diberitahukan ke ahli waris.',
    operationId: 'assetsReviewLiquidationProof',
  })
  @ApiParam({ name: 'proofId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Keputusan tinjauan berhasil dicatat.' })
  @Audit({
    action: AuditAction.ASSET_UPDATED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Notaris meninjau bukti pencairan',
  })
  reviewLiquidationProof(
    @Param('proofId', new ParseUUIDPipe({ version: '4' })) proofId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewLiquidationProofDto,
  ): Promise<{ message: string }> {
    return this.orchestrator.reviewLiquidationProof(proofId, user.sub, dto);
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
  @Audit({
    action: AuditAction.ASSET_UPDATED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Pewaris mengupdate detail harta warisan',
  })
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
  @Audit({
    action: AuditAction.ASSET_DELETED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Pewaris menghapus harta warisan',
  })
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
  @Audit({
    action: AuditAction.ASSET_VERIFIED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Notaris memverifikasi harta warisan',
  })
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
  @Audit({
    action: AuditAction.ASSET_REJECTED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Notaris menolak verifikasi harta warisan',
  })
  rejectAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssetResponseDto> {
    return this.orchestrator.rejectAsset(id, user.sub, dto.reason);
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
  @Audit({
    action: AuditAction.ASSET_UPDATED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Pewaris mengalokasikan aset ke ahli waris',
  })
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
    summary: '(AHLI WARIS) Ambil Bagian Kunci untuk Membuka Brankas',
    description:
      'Endpoint ini TIDAK mengembalikan kredensial dalam bentuk utuh. Eksekutor menerima ' +
      '`systemShare`, lalu WAJIB menggabungkannya di sisi klien dengan bagian kunci Eksekutor ' +
      'yang tersimpan di perangkatnya (Shamir combine). Server tidak pernah merekonstruksi ' +
      'kredensial, sehingga kunci utuh tidak pernah ada di memori server maupun melintas jaringan.\n\n' +
      'Ahli Waris non-eksekutor hanya melihat info aset tanpa bagian kunci apa pun.',
    operationId: 'assetsUnlock',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Bagian kunci berhasil diserahkan ke Eksekutor',
  })
  @Audit({
    action: AuditAction.VAULT_SHARE_RELEASED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.WARNING,
    resource: 'Asset',
    description: 'Eksekutor mengambil bagian kunci brankas',
  })
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
  @Audit({
    action: AuditAction.LIQUIDATION_PROOF_UPLOADED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Eksekutor mengunggah bukti pencairan',
  })
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
  @Audit({
    action: AuditAction.ASSET_UPDATED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.INFO,
    resource: 'Asset',
    description: 'Ahli Waris mengonfirmasi penerimaan dana',
  })
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
      'Notaris menutup kasus warisan secara final. Data encryptedSecret akan dihancurkan (cryptographic wipe).\n\n' +
      'Wajib semua ahli waris non-eksekutor sudah acknowledge penerimaan bagian. Jika belum, ' +
      'isi `reason` untuk menutup paksa (force-close) — tindakan ini dicatat penuh di audit trail.',
    operationId: 'assetsClose',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Kasus berhasil ditutup dan data dihancurkan' })
  @ApiConflictResponse({
    description:
      "Masih ada ahli waris yang belum acknowledge dan 'reason' tidak diisi.",
  })
  @Audit({
    action: AuditAction.ASSET_FORCE_CLOSED,
    category: AuditCategory.WARIS_ASSET,
    severity: AuditSeverity.WARNING,
    resource: 'Asset',
    description: 'Notaris menutup kasus aset',
  })
  closeAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CloseAssetDto,
  ) {
    return this.orchestrator.closeAsset(id, user.sub, dto.reason);
  }
}
