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
  AssetAlreadyVerifiedException,
  AssetNotFoundException,
  AssetNotOwnedException,
  AssetAllocationExceededException,
  InvalidAssetStatusTransitionException,
  InvalidKeyShareFormatException,
  HeirsNotAcknowledgedException,
  AllocationDeviatesFromLegalSchemeException,
} from '../../domains/exceptions/asset.exception';

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
  module: 'assets';
}

@Catch(HttpException, Error)
export class AssetExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AssetExceptionFilter.name);

  catch(exception: Error | HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Terjadi kesalahan pada layanan Aset.';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'object' && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      errorName = exception.name;
    } else if (exception instanceof AssetNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof AssetNotOwnedException) {
      status = HttpStatus.FORBIDDEN;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof AssetAlreadyVerifiedException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof AssetAllocationExceededException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof InvalidKeyShareFormatException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof InvalidAssetStatusTransitionException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof HeirsNotAcknowledgedException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorName = exception.name;
    } else if (
      exception instanceof AllocationDeviatesFromLegalSchemeException
    ) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorName = exception.name;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[Assets] ${req.method} ${req.url} → ${JSON.stringify(message)} | ${exception.stack}`,
      );
      message = 'Terjadi kesalahan pada layanan Aset.';
    } else {
      this.logger.warn(
        `[Assets] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      error: errorName,
      module: 'assets',
    };

    res.status(status).json(body);
  }
}
