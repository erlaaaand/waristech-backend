// src/storage/interface/guards/file-size.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Guard tambahan sebagai defense-in-depth untuk validasi ukuran file.
 * Berjalan sebelum controller — melengkapi validasi di FileValidator domain.
 */
@Injectable()
export class FileSizeGuard implements CanActivate {
  private readonly MAX_BYTES = 10 * 1024 * 1024; // 10MB hard cap at guard layer

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const rawContentLength = request.headers['content-length'];

    if (typeof rawContentLength === 'string') {
      const contentLength = parseInt(rawContentLength, 10);
      if (!isNaN(contentLength) && contentLength > this.MAX_BYTES) {
        throw new PayloadTooLargeException(
          'Ukuran request melebihi batas maksimum 10MB',
        );
      }
    }

    return true;
  }
}
