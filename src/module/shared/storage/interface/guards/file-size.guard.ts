// src/storage/interface/guards/file-size.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request } from 'express';
import { StorageDomainService } from '../../domains/services/storage-domain.service';

/**
 * Guard tambahan sebagai defense-in-depth untuk validasi ukuran file.
 * Berjalan sebelum controller — melengkapi validasi di FileValidator domain.
 * Batasnya mengikuti StorageDomainService.MAX_SIZE_BYTES (satu sumber
 * kebenaran) — jangan hardcode angka lain di sini, supaya tidak lagi
 * berbeda dengan batas yang benar-benar divalidasi & didokumentasikan.
 */
@Injectable()
export class FileSizeGuard implements CanActivate {
  constructor(private readonly storageDomainService: StorageDomainService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const maxBytes = this.storageDomainService.MAX_SIZE_BYTES;

    const rawContentLength = request.headers['content-length'];

    if (typeof rawContentLength === 'string') {
      const contentLength = parseInt(rawContentLength, 10);
      if (!isNaN(contentLength) && contentLength > maxBytes) {
        throw new PayloadTooLargeException(
          `Ukuran request melebihi batas maksimum ${this.storageDomainService.getMaxSizeMb()}MB`,
        );
      }
    }

    return true;
  }
}
