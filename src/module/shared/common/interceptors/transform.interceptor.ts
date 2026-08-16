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
