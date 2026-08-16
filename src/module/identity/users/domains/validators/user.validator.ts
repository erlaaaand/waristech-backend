import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserValidator {
  assertExists(
    user: UserEntity | null,
    id: string,
  ): asserts user is UserEntity {
    if (!user) {
      throw new NotFoundException(`User dengan id '${id}' tidak ditemukan`);
    }
  }

  assertEmailNotTaken(isTaken: boolean, email: string): void {
    if (isTaken) {
      throw new ConflictException(`Email '${email}' sudah digunakan`);
    }
  }

  assertIsActive(user: UserEntity): void {
    if (!user.isActive) {
      throw new UnauthorizedException('Akun ini sudah dinonaktifkan');
    }
  }

  async assertPasswordMatch(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<void> {
    const isMatch = await compare(plainPassword, hashedPassword);

    if (!isMatch) {
      throw new UnauthorizedException('Password saat ini tidak sesuai');
    }
  }
}
