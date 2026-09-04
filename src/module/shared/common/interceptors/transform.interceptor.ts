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
        const msg =
          isObject && 'message' in data
            ? (data as Record<string, unknown>).message
            : 'Operation successful';
        const innerData =
          isObject && 'data' in data
            ? (data as Record<string, unknown>).data
            : (data ?? null);

        return {
          statusCode: response.statusCode,
          message: typeof msg === 'string' ? msg : 'Operation successful',
          data: innerData as T,
        };
      }),
    );
  }
}
