// src/auth/infrastructures/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../domains/entities/jwt-payload.entity';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token: string | null = null;

          // 1. Coba ambil dari HttpOnly cookie bernama 'accessToken'
          if (request && request.cookies) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const cookieToken = request.cookies['accessToken'];
            if (typeof cookieToken === 'string') {
              token = cookieToken;
            }
          }

          // 2. Fallback: Jika di cookie tidak ada, coba ambil dari header Authorization
          // (Berguna untuk testing via Postman atau Swagger UI)
          if (!token && request.headers && request.headers.authorization) {
            const authHeader = request.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
              token = authHeader.substring(7);
            }
          }

          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: config.getOrThrow<string>('JWT_ISSUER'),
      audience: config.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || payload.sub.trim().length === 0) {
      throw new UnauthorizedException(
        'Token tidak valid: subject claim kosong.',
      );
    }

    if (!payload.email || payload.email.trim().length === 0) {
      throw new UnauthorizedException('Token tidak valid: email claim kosong.');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
