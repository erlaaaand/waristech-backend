import { Injectable, Logger } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  type ThrottlerRequest,
} from '@nestjs/throttler';

/**
 * `ThrottlerGuard` bawaan memanggil `storageService.increment()` (Redis)
 * tanpa try/catch — bila Redis sedang tidak terjangkau, kegagalan itu
 * merambat sebagai exception tak tertangani dari SETIAP request yang lewat
 * guard ini (guard ini didaftarkan global), sehingga satu Redis yang down
 * bisa melumpuhkan seluruh API dengan 500 generik yang sama sekali tidak
 * menyebut Redis.
 *
 * Guard ini menambahkan "fail open": bila storage rate-limit gagal diakses
 * (bukan karena limit benar-benar terlampaui), request tetap diizinkan lewat
 * dan kegagalannya dicatat di log — rate limiting jadi tidak aktif sementara
 * alih-alih memblokir seluruh aplikasi. Saat limit BENAR-BENAR terlampaui
 * (`ThrottlerException`), perilaku normal tetap dipertahankan.
 */
@Injectable()
export class ResilientThrottlerGuard extends ThrottlerGuard {
  private readonly resilientLogger = new Logger(ResilientThrottlerGuard.name);

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    try {
      return await super.handleRequest(requestProps);
    } catch (error: unknown) {
      if (error instanceof ThrottlerException) {
        throw error;
      }
      this.resilientLogger.error(
        'Gagal mengakses storage rate-limit (kemungkinan Redis down) — ' +
          'rate limiting DILEWATI sementara untuk request ini agar API tetap berjalan.',
        error instanceof Error ? error.stack : String(error),
      );
      return true;
    }
  }
}
