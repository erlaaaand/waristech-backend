// src/auth/interface/filters/auth-exception.filter.ts
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
  InvalidCredentialsError,
  AccountDisabledError,
  AuthTokenExpiredError,
  InvalidTokenError,
  InvalidInvitationCodeError,
} from '../../domains/exceptions/auth.exception';
import { EkycValidationException } from '../../../ekyc/domains/exceptions/ekyc.exception';

interface AuthErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
  module: 'auth';
}

@Catch(HttpException, Error)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(exception: Error | HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] =
      'Terjadi kesalahan internal pada layanan Autentikasi.';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object' && 'message' in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : exception.message;
      errorName = exception.name;
    } else if (
      exception instanceof InvalidCredentialsError ||
      exception instanceof AccountDisabledError ||
      exception instanceof AuthTokenExpiredError ||
      exception instanceof InvalidTokenError
    ) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof InvalidInvitationCodeError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof EkycValidationException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = exception.message;
      errorName = 'NIK_VALIDATION_FAILED';
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[Auth] SYSTEM ERROR ${req.method} ${req.url} → Asli: ${JSON.stringify(message)} | Stack: ${exception.stack}`,
      );
      // Hindari membocorkan detail internal
      message = 'Terjadi kesalahan internal pada layanan Autentikasi.';
    } else {
      this.logger.warn(
        `[Auth] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body: AuthErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      error: errorName,
      module: 'auth',
    };

    res.status(status).json(body);
  }
}
