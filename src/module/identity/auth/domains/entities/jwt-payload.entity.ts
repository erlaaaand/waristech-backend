import { UserRole } from '../../../users/domains/entities/user.entity';

export class JwtPayload {
  sub: string = '';
  email: string = '';
  role: UserRole | string = '';
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}

export class AuthenticatedUser {
  sub: string = '';
  email: string = '';
  role: UserRole | string = '';
}
