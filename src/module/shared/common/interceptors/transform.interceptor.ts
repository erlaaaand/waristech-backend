import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: unknown) => {
        // 204 No Content secara semantik TIDAK boleh punya response body —
        // membungkusnya jadi JSON melanggar spesifikasi HTTP meski sebagian
        // besar klien tetap mentolerirnya.
        const HTTP_NO_CONTENT = 204;
        if (response.statusCode === HTTP_NO_CONTENT) {
          return undefined as unknown as Response<T>;
        }

        const isObject = data !== null && typeof data === 'object';
        const rawMsg =
          isObject && 'message' in data
            ? (data as Record<string, unknown>).message
            : undefined;

        // Catatan: controller kadang mengembalikan objek dengan field `data`
        // miliknya sendiri yang bersifat domain (mis. PaginatedUsersResponseDto
        // = { data, total, page, limit, totalPages }) — bukan sebagai envelope
        // manual. Field tersebut TIDAK boleh "dibongkar" di sini, karena akan
        // membuang total/page/totalPages yang jadi saudara dari `data`.
        // Seluruh return value controller selalu dibungkus utuh sebagai `data`;
        // hanya `message` yang boleh di-override jika controller menyediakannya.
        return {
          statusCode: response.statusCode,
          message: typeof rawMsg === 'string' ? rawMsg : 'Operation successful',
          data: (data ?? null) as T,
        };
      }),
    );
  }
}
