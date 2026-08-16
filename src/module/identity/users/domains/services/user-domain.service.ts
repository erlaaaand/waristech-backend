// src/users/domains/services/user-domain.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserDomainService {
  private readonly SALT_ROUNDS = 12;

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.SALT_ROUNDS);
  }

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
