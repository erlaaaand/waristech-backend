// src/auth/domains/validators/auth.validator.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../../users/domains/entities/user.entity';
import {
  InvalidCredentialsError,
  AccountDisabledError,
} from '../exceptions/auth.exception';

const DUMMY_HASH =
  '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiNb/k/cG/MRcLeGimGNA.n16vLzmu';

@Injectable()
export class AuthValidator {
  assertUserExists(user: UserEntity | null): asserts user is UserEntity {
    if (!user) {
      throw new InvalidCredentialsError();
    }
  }

  assertUserIsActive(user: UserEntity): void {
    if (!user.isActive) {
      throw new AccountDisabledError();
    }
  }

  async assertPasswordValid(
    plainPassword: string,
    hashedPassword: string | null,
  ): Promise<void> {
    const hashToCompare = hashedPassword ?? DUMMY_HASH;
    const isMatch = await bcrypt.compare(plainPassword, hashToCompare);

    if (!isMatch || !hashedPassword) {
      throw new InvalidCredentialsError();
    }
  }
}
