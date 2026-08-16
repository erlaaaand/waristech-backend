// src/storage/domains/validators/file.validator.ts
import {
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StorageDomainService } from '../services/storage-domain.service';

export interface IUploadedFile {
  mimetype: string;
  size: number;
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class FileValidator {
  constructor(private readonly domainService: StorageDomainService) {}

  assertFilePresent(
    file: IUploadedFile | undefined | null,
  ): asserts file is IUploadedFile {
    if (!file) {
      throw new UnprocessableEntityException(
        'File wajib disertakan dalam request',
      );
    }
  }

  assertAllowedMimeType(mimeType: string): void {
    if (!this.domainService.isAllowedMimeType(mimeType)) {
      throw new UnprocessableEntityException(
        `Tipe file '${mimeType}' tidak didukung. ` +
          `Gunakan: ${this.domainService.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  assertWithinSizeLimit(sizeInBytes: number): void {
    if (!this.domainService.isWithinSizeLimit(sizeInBytes)) {
      throw new PayloadTooLargeException(
        `Ukuran file ${this.domainService.formatFileSize(sizeInBytes)} ` +
          `melebihi batas maksimum ${this.domainService.getMaxSizeMb()}MB`,
      );
    }
  }

  assertAll(
    file: IUploadedFile | undefined | null,
  ): asserts file is IUploadedFile {
    this.assertFilePresent(file);

    this.assertAllowedMimeType(file.mimetype);
    this.assertWithinSizeLimit(file.size);
  }
}
