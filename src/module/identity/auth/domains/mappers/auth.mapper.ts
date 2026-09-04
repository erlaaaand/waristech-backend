// src/auth/domains/mappers/auth.mapper.ts
import { Injectable } from '@nestjs/common';
import { UserDomain } from '../../../users/domains/entities/user.entity';
import {
  AuthResponseDto,
  AuthUserDto,
} from '../../applications/dto/auth-response.dto';
import { JwtPayload } from '../entities/jwt-payload.entity';

@Injectable()
export class AuthMapper {
  toJwtPayload(user: UserDomain): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }

  toAuthUserDto(user: UserDomain): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  toAuthResponseDto(
    accessToken: string,
    expiresIn: string,
    user: UserDomain,
  ): AuthResponseDto {
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toAuthUserDto(user),
    };
  }
}
