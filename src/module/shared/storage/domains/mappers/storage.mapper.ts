// src/shared/storage/domains/mappers/storage.mapper.ts
import { Injectable } from '@nestjs/common';
import {
  FilePurpose,
  RawUploadedFile,
  StoredFileDomain,
} from '../entities/stored-file.entity';
import { StorageResponseDto } from '../../applications/dto/storage-response.dto';
import { UploadResult } from '../../infrastructures/adapters/storage.adapter.interface';
import type { ICreateStoredFileData } from '../repositories/stored-file.repository.interface';

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

  toCreateData(
    result: UploadResult,
    userId: string,
    purpose: FilePurpose = FilePurpose.OTHER,
  ): ICreateStoredFileData {
    return {
      userId,
      fileKey: result.fileKey,
      fileUrl: result.fileUrl,
      originalName: result.originalName,
      mimeType: result.mimeType,
      sizeInBytes: result.sizeInBytes,
      provider: result.provider,
      purpose,
    };
  }

  toResponseDto(entity: StoredFileDomain): StorageResponseDto {
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
