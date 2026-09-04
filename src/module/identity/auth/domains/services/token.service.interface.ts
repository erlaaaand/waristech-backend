import { AuthenticatedUser, JwtPayload } from '../entities/jwt-payload.entity';

export abstract class ITokenService {
  abstract generateAccessToken(payload: JwtPayload): string;
  abstract verifyAccessToken(token: string): JwtPayload;
  abstract decodeToAuthUser(payload: JwtPayload): AuthenticatedUser;
  abstract getExpiresIn(): string;
}

export const TOKEN_SERVICE_TOKEN = Symbol('ITokenService');
