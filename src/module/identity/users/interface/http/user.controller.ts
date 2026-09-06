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
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { UserOrchestrator } from '../../applications/orchestrator/user.orchestrator';
import { FindUsersQueryDto } from '../../applications/dto/find-users-query.dto';
import { UpdateUserDto } from '../../applications/dto/update-user.dto';
import { UpdateAvatarDto } from '../../applications/dto/update-avatar.dto';
import { UserResponseDto } from '../../applications/dto/user-response.dto';
import { PaginatedUsersResponseDto } from '../../applications/dto/paginated-users-response.dto';
import { UserExceptionFilter } from '../filters/user-exception.filter';
import { JwtAuthGuard } from '../../../auth/interface/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/interface/decorators/current-user.decorator';
import { RolesGuard } from '../../../auth/interface/guards/roles.guard';
import { AdminCreateUserDto } from '../../applications/dto/admin-create-user.dto';
import { RegisterPublicKeyDto } from '../../applications/dto/register-public-key.dto';
import { UserRole } from '../../domains/entities/user.entity';
import { Roles } from '../../../auth/interface/decorators/roles.decorator';
import { Audit } from '../../../../shared/audit/decorators/audit.decorator';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../../shared/audit/domains/enums/audit.enum';
import { AuthenticatedUser } from '../../../auth/domains/entities/jwt-payload.entity';

@ApiTags('Identity - Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseFilters(UserExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly orchestrator: UserOrchestrator) {}

  // ── POST /users/admin/create ───────────────────────────────────────────────

  @Throttle({ dashboard: {} })
  @Audit({
    action: AuditAction.USER_CREATE,
    category: AuditCategory.EMPLOYEE,
    resource: 'User',
    severity: AuditSeverity.WARNING,
    description: 'Admin membuat akun pengguna/karyawan baru langsung aktif',
  })
  @Post('admin/create')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '(ADMIN) Membuat akun user baru (Langsung Terverifikasi)',
    description:
      'Endpoint khusus Admin untuk membuat akun pengguna baru yang otomatis terverifikasi.',
    operationId: 'usersAdminCreate',
  })
  @ApiCreatedResponse({
    description: 'Akun berhasil dibuat dan otomatis terverifikasi',
    schema: {
      example: {
        message: 'Akun berhasil dibuat dan langsung terverifikasi.',
        userId: 'uuid-string',
        email: 'peserta@gmail.com',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Format email atau data DTO tidak valid.',
  })
  @ApiForbiddenResponse({ description: 'Akses ditolak. Hanya untuk Admin.' })
  async createByAdmin(
    @Body() dto: AdminCreateUserDto,
  ): Promise<{ message: string; userId: string }> {
    return this.orchestrator.adminCreateUser(dto);
  }

  // ── GET /admin/dashboard-stats ─────────────────────────────────────────────

  @Get('admin/dashboard-stats')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '(ADMIN) Mendapatkan statistik dashboard',
    description:
      'Mengambil jumlah pengguna, aset terdaftar, aset pending, dan log kritis.',
    operationId: 'adminDashboardStats',
  })
  @ApiOkResponse({ description: 'Berhasil mendapatkan statistik' })
  @ApiForbiddenResponse({ description: 'Akses ditolak. Hanya untuk Admin.' })
  async getDashboardStats() {
    return this.orchestrator.getAdminDashboardStats();
  }

  // ── GET /users ─────────────────────────────────────────────────────────────

  @SkipThrottle()
  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '(ADMIN) Mendapatkan daftar seluruh user dengan pagination',
    description:
      'Mengambil daftar seluruh pengguna dengan dukungan pencarian dan pagination.',
    operationId: 'usersFindAll',
  })
  @ApiOkResponse({
    description: 'Berhasil mendapatkan daftar user',
    type: PaginatedUsersResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Akses ditolak. Hanya untuk Admin.' })
  async findAll(
    @Query() query: FindUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.orchestrator.findAll(query);
  }

  // ── GET /users/me ──────────────────────────────────────────────────────────

  @SkipThrottle()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lihat profil saya',
    description:
      'Mengambil data profil user yang sedang login berdasarkan JWT token.',
    operationId: 'usersGetMe',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'Data profil berhasil diambil.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau tidak valid.' })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.orchestrator.getById(user.sub, user);
  }

  // ── PATCH /users/me/avatar ─────────────────────────────────────────────────

  @Patch('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Perbarui foto profil',
    description:
      'Memperbarui foto profil user yang sedang login.\n\n' +
      '1. Upload file foto ke `POST /storage/upload` dengan `purpose: PROFILE_PHOTO`.\n' +
      '2. Kirim `fileUrl` tersebut ke endpoint ini sebagai `avatarUrl`.',
    operationId: 'usersUpdateAvatar',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'Foto profil berhasil diperbarui.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau tidak valid.' })
  @ApiBadRequestResponse({ description: 'avatarUrl tidak valid / kosong.' })
  @Audit({
    action: AuditAction.USER_UPDATE,
    category: AuditCategory.SYSTEM,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Update foto profil user',
  })
  async updateAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvatarDto,
  ): Promise<UserResponseDto> {
    return this.orchestrator.updateAvatar(user.sub, dto.avatarUrl);
  }

  // ── POST /users/me/public-key ──────────────────────────────────────────────

  @Post('me/public-key')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.NOTARIS)
  @ApiOperation({
    summary: '(NOTARIS) Daftarkan public key untuk penitipan bagian kunci',
    description:
      'Notaris membuat keypair di sisi klien lalu mendaftarkan public key-nya di sini. ' +
      'Bagian kunci aset yang dititipkan kepada Notaris akan dienkripsi dengan kunci ini, ' +
      'sehingga server menyimpan ciphertext yang tidak dapat ia buka sendiri.\n\n' +
      '**Private key WAJIB tetap di perangkat Notaris — jangan pernah dikirim ke server.**',
    operationId: 'usersRegisterPublicKey',
  })
  @ApiOkResponse({ description: 'Public key berhasil didaftarkan.' })
  @ApiBadRequestResponse({ description: 'Format public key tidak valid.' })
  @Audit({
    action: AuditAction.USER_UPDATE,
    category: AuditCategory.SYSTEM,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Pendaftaran public key Notaris',
  })
  async registerPublicKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPublicKeyDto,
  ): Promise<{ message: string }> {
    return this.orchestrator.registerPublicKey(user.sub, dto);
  }

  // ── GET /users/notaries ────────────────────────────────────────────────────

  @SkipThrottle()
  @Get('notaries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ambil daftar seluruh Notaris',
    description:
      'Dipakai oleh Pewaris saat mendaftarkan aset untuk memilih Notaris yang ditugaskan.',
    operationId: 'usersGetNotaries',
  })
  @ApiOkResponse({ description: 'Daftar Notaris berhasil diambil.' })
  async getNotaries(): Promise<{ id: string; fullName: string }[]> {
    return this.orchestrator.getNotaries();
  }

  // ── GET /users/notaris/:id/public-key ──────────────────────────────────────

  @SkipThrottle()
  @Get('notaris/:id/public-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ambil public key Notaris',
    description:
      'Dipakai klien Pewaris untuk mengenkripsi bagian kunci milik Notaris sebelum dititipkan ' +
      'via POST /assets/:id/notaris-share.',
    operationId: 'usersGetNotarisPublicKey',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Public key Notaris berhasil diambil.' })
  @ApiNotFoundResponse({
    description: 'Notaris tidak ditemukan atau belum mendaftarkan public key.',
  })
  async getNotarisPublicKey(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ notarisId: string; fullName: string; publicKey: string }> {
    return this.orchestrator.getNotarisPublicKey(id);
  }

  // ── GET /users/:id ─────────────────────────────────────────────────────────

  @SkipThrottle()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lihat profil berdasarkan ID',
    description:
      'Mengambil data profil user berdasarkan UUID.\n\n' +
      'Pengguna biasa hanya boleh mengakses profil milik sendiri. Admin dapat melihat profil user mana pun.',
    operationId: 'usersGetById',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'UUID user yang dicari',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'Profil user berhasil diambil.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau tidak valid.' })
  @ApiForbiddenResponse({
    description: 'Anda tidak memiliki izin untuk mengakses profil user lain.',
  })
  @ApiNotFoundResponse({ description: 'User tidak ditemukan.' })
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.orchestrator.getById(id, user);
  }

  // ── PATCH /users/:id ───────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update profil',
    description:
      'Update nama lengkap dan/atau password.\n\n' +
      'Pengguna biasa hanya bisa mengubah profil sendiri. Admin dapat mengedit profil user mana pun.',
    operationId: 'usersUpdate',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'UUID user yang akan diubah',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'Profil berhasil diperbarui.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid, atau currentPassword salah.',
  })
  @ApiForbiddenResponse({
    description: 'Tidak boleh mengubah profil user lain.',
  })
  @ApiNotFoundResponse({ description: 'User tidak ditemukan.' })
  @ApiBadRequestResponse({
    description: 'Validasi gagal — field tidak sesuai ketentuan.',
  })
  @Audit({
    action: AuditAction.USER_UPDATE,
    category: AuditCategory.SYSTEM,
    severity: AuditSeverity.INFO,
    resource: 'User',
    description: 'Update profil pengguna',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.orchestrator.update(id, dto, user);
  }
}
