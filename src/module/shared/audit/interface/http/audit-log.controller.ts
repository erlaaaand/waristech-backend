import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuditLogService } from '../../applications/services/audit-log.service';
import {
  AuditCategory,
  AuditSeverity,
  AuditStatus,
} from '../../domains/enums/audit.enum';
import { JwtAuthGuard } from '../../../../identity/auth/interface/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../identity/auth/interface/guards/roles.guard';
import { Roles } from '../../../../identity/auth/interface/decorators/roles.decorator';
import { UserRole } from '../../../../identity/users/domains/entities/user.entity';

@ApiTags('Admin - Audit Logs & Forensic Trail')
@ApiBearerAuth('JWT')
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @SkipThrottle()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      '(ADMIN) Mengambil riwayat audit log sistem yang tersimpan di MongoDB',
    description:
      'Audit log bersifat *append-only* dan *immutable*. Digunakan untuk investigasi forensik, tracking perubahan stok gudang, aktivitas karyawan, dan keamanan otentikasi.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'category', required: false, enum: AuditCategory })
  @ApiQuery({ name: 'severity', required: false, enum: AuditSeverity })
  @ApiQuery({ name: 'status', required: false, enum: AuditStatus })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2026-08-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2026-08-31',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ description: 'Data audit log berhasil diambil' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: AuditCategory,
    @Query('severity') severity?: AuditSeverity,
    @Query('status') status?: AuditStatus,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.auditLogService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      category,
      severity,
      status,
      action,
      userId,
      resource,
      resourceId,
      startDate,
      endDate,
      search,
    });
  }

  @SkipThrottle()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '(ADMIN) Detail log audit spesifik beserta state perubahan data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'MongoDB ObjectId audit log',
  })
  @ApiOkResponse({ description: 'Detail log audit berhasil diambil' })
  async findById(@Param('id') id: string) {
    const log = await this.auditLogService.findById(id);
    if (!log) {
      throw new NotFoundException(`Audit log dengan ID ${id} tidak ditemukan`);
    }
    return log;
  }
}
