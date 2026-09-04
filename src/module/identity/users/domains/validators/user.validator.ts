import {
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import { UserDomain, UserRole } from '../entities/user.entity';
import { AuthenticatedUser } from '../../../auth/domains/entities/jwt-payload.entity';

@Injectable()
export class UserValidator {
  assertExists(
    user: UserDomain | null,
    id: string,
  ): asserts user is UserDomain {
    if (!user) {
      throw new NotFoundException(`User dengan id '${id}' tidak ditemukan`);
    }
  }

  assertEmailNotTaken(isTaken: boolean, email: string): void {
    if (isTaken) {
      throw new ConflictException(`Email '${email}' sudah digunakan`);
    }
  }

  assertNikNotTaken(isTaken: boolean, nik: string): void {
    if (isTaken) {
      throw new ConflictException(
        `NIK '${nik}' sudah terdaftar pada akun lain`,
      );
    }
  }

  assertIsActive(user: UserDomain): void {
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

  assertHasAccessToProfile(
    requestingUser: AuthenticatedUser,
    targetUserId: string,
  ): void {
    if (
      String(requestingUser.role) !== String(UserRole.ADMIN) &&
      requestingUser.sub !== targetUserId
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengakses profil user ini.',
      );
    }
  }
}
