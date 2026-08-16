// src/shared/storage/domains/mappers/storage.mapper.ts
import { Injectable } from '@nestjs/common';
import {
  FilePurpose,
  RawUploadedFile,
  StoredFileEntity,
} from '../entities/stored-file.entity';
import { StorageResponseDto } from '../../applications/dto/storage-response.dto';
import { UploadResult } from '../../infrastructures/adapters/storage.adapter.interface';

export interface IUploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class StorageMapper {
  toRawUploadedFile(file: IUploadedFile): RawUploadedFile {
    return {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeInBytes: file.size,
    };
  }

  toEntity(
    result: UploadResult,
    userId: string,
    purpose: FilePurpose = FilePurpose.OTHER,
  ): StoredFileEntity {
    const entity = new StoredFileEntity();
    entity.userId = userId;
    entity.fileKey = result.fileKey;
    entity.fileUrl = result.fileUrl;
    entity.originalName = result.originalName;
    entity.mimeType = result.mimeType;
    entity.sizeInBytes = result.sizeInBytes;
    entity.provider = result.provider;
    entity.purpose = purpose;
    return entity;
  }

  toResponseDto(entity: StoredFileEntity): StorageResponseDto {
    return {
      storedFileId: entity.id, // ID dari DB — tersedia setelah save()
      fileKey: entity.fileKey,
      fileUrl: entity.fileUrl,
      originalName: entity.originalName,
      mimeType: entity.mimeType,
      sizeInBytes: entity.sizeInBytes,
      provider: entity.provider,
      uploadedAt: entity.createdAt, // createdAt tersedia setelah save()
    };
  }
}
