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
  InvitationExpiredException,
  InvitationAlreadyUsedException,
  InvitationNotFoundException,
  FamilyMemberNotFoundException,
  NotAuthorizedForFamilyMemberException,
  DeathVerificationNotFoundException,
  MissingSupportingDocumentException,
  InvalidFamilyMemberStatusTransitionException,
  NonNasabRequiresNotarisVerificationException,
  AlreadyFamilyMemberException,
} from '../../domains/exceptions/inheritance.exception';

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
  module: 'inheritance';
}

@Catch(HttpException, Error)
export class InheritanceExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(InheritanceExceptionFilter.name);

  catch(exception: Error | HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Terjadi kesalahan pada layanan Waris.';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'object' && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      errorName = exception.name;
    } else if (
      exception instanceof InvitationNotFoundException ||
      exception instanceof FamilyMemberNotFoundException ||
      exception instanceof DeathVerificationNotFoundException
    ) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof InvitationAlreadyUsedException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof InvitationExpiredException) {
      status = HttpStatus.GONE;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof NotAuthorizedForFamilyMemberException) {
      status = HttpStatus.FORBIDDEN;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof MissingSupportingDocumentException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      errorName = exception.name;
    } else if (
      exception instanceof InvalidFamilyMemberStatusTransitionException
    ) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorName = exception.name;
    } else if (
      exception instanceof NonNasabRequiresNotarisVerificationException
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      errorName = exception.name;
    } else if (exception instanceof AlreadyFamilyMemberException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorName = exception.name;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[Inheritance] ${req.method} ${req.url} → ${JSON.stringify(message)} | ${exception.stack}`,
      );
      message = 'Terjadi kesalahan pada layanan Waris.';
    } else {
      this.logger.warn(
        `[Inheritance] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      error: errorName,
      module: 'inheritance',
    };

    res.status(status).json(body);
  }
}
