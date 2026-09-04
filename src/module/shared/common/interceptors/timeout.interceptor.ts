import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

// 30 detik — sebelumnya 10 detik, yang sama persis dengan timeout internal
// SMTP di MailService (connectionTimeout/socketTimeout 10000ms) dan terlalu
// singkat untuk upload file ke storage eksternal (S3/Supabase) di jaringan
// yang lambat. Interceptor global ini harus punya jeda LEBIH LONGGAR dari
// timeout internal setiap layanan yang dipanggilnya, supaya pesan error yang
// lebih informatif dari layanan tsb (mis. MailService) yang muncul duluan,
// bukan "Request Timeout" generik dari sini.
const GLOBAL_REQUEST_TIMEOUT_MS = 30000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(GLOBAL_REQUEST_TIMEOUT_MS),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request Timeout'),
          );
        }
        return throwError(() => err as Error);
      }),
    );
  }
}
