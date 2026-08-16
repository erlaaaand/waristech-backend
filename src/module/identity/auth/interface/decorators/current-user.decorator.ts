// src/auth/interface/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { Request } from 'express';

const logger = new Logger('CurrentUserDecorator');

export interface JwtUserPayload {
  sub: string; // userId (UUID)
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (field: keyof JwtUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtUserPayload }>();

    const user = request.user;

    if (!user) {
      logger.error(
        'request.user tidak ada. ' +
          'Kemungkinan JwtAuthGuard tidak berjalan atau Passport strategy error. ' +
          `Path: ${request.method} ${request.url}`,
      );
      return undefined;
    }

    if (field === 'sub' && (!user.sub || user.sub.trim().length === 0)) {
      const userKeys = Object.keys(user).join(', ');
      logger.error(
        `request.user.sub kosong atau tidak ada. ` +
          `Keys yang tersedia di request.user: [${userKeys}]. ` +
          `Pastikan JwtStrategy.validate() mengembalikan { sub: uuid, email: '...' }. ` +
          `Path: ${request.method} ${request.url}`,
      );
    }

    return field ? user?.[field] : user;
  },
);
