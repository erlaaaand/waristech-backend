// src/storage/interface/http/storage.controller.ts
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { StorageOrchestrator } from '../../applications/orchestrator/storage.orchestrator';
import { UploadFileDto } from '../../applications/dto/upload-file.dto';
import { StorageResponseDto } from '../../applications/dto/storage-response.dto';
import { StorageExceptionFilter } from '../filters/storage-exception.filter';
import { FileUploadInterceptor } from '../interceptors/file-upload.interceptor';
import { FileSizeGuard } from '../guards/file-size.guard';
import { JwtAuthGuard } from '../../../../identity/auth/interface/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../identity/auth/interface/decorators/current-user.decorator';
import { FilePurpose } from '../../domains/entities/stored-file.entity';

@ApiTags('Storage')
@ApiBearerAuth('JWT')
@Controller('storage')
@UseFilters(StorageExceptionFilter)
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly orchestrator: StorageOrchestrator) {}

  // ── Upload ─────────────────────────────────────────────────────────────────

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(FileSizeGuard)
  @UseInterceptors(FileUploadInterceptor)
  @ApiOperation({
    summary: 'Upload berkas / media',
    description:
      'Upload file gambar atau dokumen (Produk, Avatar, Bukti Pembayaran, dll).\n\n' +
      '**Format yang didukung:** JPG, PNG, WebP, PDF\n\n' +
      '**Ukuran maksimum:** 20MB\n\n' +
      '`userId` diambil otomatis dari JWT — tidak perlu dikirim di body.\n\n' +
      'File disimpan di path: `{context}/{userId}/{uuid}.{ext}`',
    operationId: 'storageUpload',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'File wajib disertakan. `purpose` wajib dipilih untuk membedakan kategori dokumen.',
    schema: {
      type: 'object',
      required: ['file', 'purpose'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File (JPG/PNG/WebP/PDF, maks 20MB)',
        },
        purpose: {
          type: 'string',
          enum: Object.values(FilePurpose),
          example: FilePurpose.OTHER,
          description: 'Tujuan file diunggah',
        },
        context: {
          type: 'string',
          example: 'registrations',
          description: 'Sub-folder penyimpanan. Default: `general`',
        },
        provider: {
          type: 'string',
          enum: ['local', 's3', 'cloudinary'],
          example: 'local',
          description:
            'Storage provider. Default mengikuti env `STORAGE_PROVIDER`',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: StorageResponseDto,
    description:
      'File berhasil diupload. Gunakan `storedFileId` atau `fileUrl` untuk proses pendaftaran.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid.' })
  @ApiUnprocessableEntityResponse({
    description:
      'File tidak ada, format tidak didukung, atau ukuran melebihi 20MB.',
    schema: {
      example: {
        statusCode: 422,
        message:
          "Tipe file 'image/gif' tidak didukung. Gunakan: image/jpeg, image/png, application/pdf",
        error: 'UnprocessableEntityException',
        module: 'storage',
      },
    },
  })
  @ApiPayloadTooLargeResponse({
    description: 'Ukuran file melebihi batas 20MB.',
    schema: {
      example: {
        statusCode: 413,
        message: 'Ukuran file 21.50MB melebihi batas maksimum 20MB',
        error: 'PayloadTooLargeException',
        module: 'storage',
      },
    },
  })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser('sub') authenticatedUserId: string,
  ): Promise<StorageResponseDto> {
    return this.orchestrator.upload(file, dto, authenticatedUserId);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Hapus file secara permanen (Hard Delete)',
    description:
      'Menghapus fisik file dari storage sekaligus dari database. Hanya pemilik file yang dapat melakukan aksi ini.',
    operationId: 'storageDelete',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'UUID dari StoredFile yang ingin dihapus',
  })
  @ApiNoContentResponse({ description: 'File berhasil dihapus permanen.' })
  @ApiNotFoundResponse({ description: 'Data file tidak ditemukan.' })
  @ApiForbiddenResponse({
    description: 'Anda tidak memiliki hak akses untuk file ini.',
  })
  async delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('sub') authenticatedUserId: string,
  ): Promise<void> {
    await this.orchestrator.delete(id, authenticatedUserId);
  }
}
