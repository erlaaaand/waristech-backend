import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  CalculationException,
  InsufficientDataForCalculationException,
  UnsupportedCalculationMethodException,
} from '../../domains/exceptions/calculation.exception';

@Catch(HttpException, Error)
export class CalculationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CalculationExceptionFilter.name);

  catch(exception: Error | HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] =
      'Terjadi kesalahan pada layanan Kalkulator.';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'object' && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      errorName = exception.name;
    } else if (exception instanceof InsufficientDataForCalculationException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY; // 422
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof UnsupportedCalculationMethodException) {
      status = HttpStatus.BAD_REQUEST; // 400
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof CalculationException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      errorName = exception.name;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[Calculation] ${req.method} ${req.url} → ${JSON.stringify(message)} | ${exception.stack}`,
      );
      message = 'Terjadi kesalahan pada layanan Kalkulator.';
    } else {
      this.logger.warn(
        `[Calculation] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      error: errorName,
      module: 'calculation',
    });
  }
}
