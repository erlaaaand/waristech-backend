// src/users/interface/http/user.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseFilters,
  UseGuards,
  Post,
  Query,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { UserOrchestrator } from '../../applications/orchestrator/user.orchestrator';
import { UpdateUserDto } from '../../applications/dto/update-user.dto';
import { UpdateAvatarDto } from '../../applications/dto/update-avatar.dto';
import { UserResponseDto } from '../../applications/dto/user-response.dto';
import { PaginatedUsersResponseDto } from '../../applications/dto/paginated-users-response.dto';
import { UserExceptionFilter } from '../filters/user-exception.filter';
import { JwtAuthGuard } from '../../../auth/interface/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/interface/decorators/current-user.decorator';
import { RolesGuard } from '../../../auth/interface/guards/roles.guard';
import {
  AdminCreateUserDto,
  UserRole,
} from '../../applications/dto/admin-create-user.dto';
import { Roles } from '../../../auth/interface/decorators/roles.decorator';
import { Audit } from '../../../../shared/audit/decorators/audit.decorator';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../../../../shared/audit/domains/enums/audit.enum';

@ApiTags('Identity - Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseFilters(UserExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly orchestrator: UserOrchestrator) {}

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
  async createByAdmin(@Body() dto: AdminCreateUserDto) {
    return this.orchestrator.adminCreateUser(dto);
  }

  @SkipThrottle()
  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '(ADMIN) Mendapatkan daftar seluruh user dengan pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'role', required: false, type: String, example: 'ADMIN' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({
    description: 'Berhasil mendapatkan daftar user',
    type: PaginatedUsersResponseDto,
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedUsersResponseDto> {
    return this.orchestrator.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 50) : 10,
      role: role || undefined,
      search: search || undefined,
    });
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
  getMe(@CurrentUser('sub') userId: string): Promise<UserResponseDto> {
    return this.orchestrator.getById(userId);
  }

  // ── PATCH /users/me/avatar ─────────────────────────────────────────────────

  @Patch('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Perbarui foto profil',
    description:
      'Memperbarui foto profil user yang sedang login.\n\n' +
      '**Alur pemakaian (2 langkah):**\n' +
      '1. Upload file foto ke `POST /storage/upload` dengan `purpose: PROFILE_PHOTO`, ' +
      'dapatkan `fileUrl` dari response-nya.\n' +
      '2. Kirim `fileUrl` tersebut ke endpoint ini sebagai `avatarUrl`.\n\n' +
      'Endpoint ini HANYA memperbarui referensi URL di profil — tidak menerima upload file secara langsung.',
    operationId: 'usersUpdateAvatar',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'Foto profil berhasil diperbarui.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau tidak valid.' })
  @ApiBadRequestResponse({ description: 'avatarUrl tidak valid / kosong.' })
  async updateAvatar(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateAvatarDto,
  ): Promise<UserResponseDto> {
    return this.orchestrator.updateAvatar(userId, dto.avatarUrl);
  }

  // ── GET /users/:id ─────────────────────────────────────────────────────────

  @SkipThrottle()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lihat profil berdasarkan ID',
    description:
      'Mengambil data profil user berdasarkan UUID.\n\n' +
      '**Hanya bisa mengakses profil milik sendiri** (ID harus cocok dengan JWT).\n\n' +
      'Untuk melihat profil sendiri lebih praktis gunakan `GET /api/v1/users/me`.',
    operationId: 'usersGetById',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'UUID user yang sama dengan userId di JWT',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'Profil user berhasil diambil.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau tidak valid.' })
  @ApiForbiddenResponse({
    description: 'Tidak boleh mengakses profil user lain.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Anda tidak memiliki izin untuk mengakses profil user lain.',
        error: 'ForbiddenException',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User tidak ditemukan.',
    schema: {
      example: {
        statusCode: 404,
        message: "User dengan id 'xxx' tidak ditemukan",
        error: 'NotFoundException',
      },
    },
  })
  async getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('sub') requestingUserId: string,
  ): Promise<UserResponseDto> {
    if (id !== requestingUserId) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengakses profil user lain.',
      );
    }
    return this.orchestrator.getById(id);
  }

  // ── PATCH /users/:id ───────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update profil',
    description:
      'Update nama lengkap dan/atau password.\n\n' +
      '**Hanya bisa mengubah profil milik sendiri.**\n\n' +
      'Untuk ganti password, wajib kirim `currentPassword` dan `newPassword` bersamaan.\n\n' +
      '```json\n' +
      '{\n' +
      '  "fullName": "Nama Baru",\n' +
      '  "currentPassword": "OldPass123",\n' +
      '  "newPassword": "NewPass456"\n' +
      '}\n' +
      '```',
    operationId: 'usersUpdate',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'UUID user yang sama dengan userId di JWT',
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
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') requestingUserId: string,
  ): Promise<UserResponseDto> {
    if (id !== requestingUserId) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengubah profil user lain.',
      );
    }
    return this.orchestrator.update(id, dto, requestingUserId);
  }
}
