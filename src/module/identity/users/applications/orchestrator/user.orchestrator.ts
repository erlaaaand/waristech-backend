// src/users/applications/orchestrator/user.orchestrator.ts
import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { CreateUserUseCase } from '../use-cases/create-user.use-case';
import { FindUserByIdUseCase } from '../use-cases/find-user-by-id.use-case';
import { FindUserByEmailUseCase } from '../use-cases/find-user-by-email.use-case';
import { UpdateUserUseCase } from '../use-cases/update-user.use-case';
import { UpdateAvatarUseCase } from '../use-cases/update-avatar.use-case';
import { AdminCreateUserUseCase } from '../use-cases/admin-create-user.use-case';
import { FindAllUsersUseCase } from '../use-cases/find-all-users.use-case';
import { AdminCreateUserDto } from '../dto/admin-create-user.dto';
import { RegisterPublicKeyDto } from '../dto/register-public-key.dto';
import { RegisterPublicKeyUseCase } from '../use-cases/register-public-key.use-case';
import { GetNotarisPublicKeyUseCase } from '../use-cases/get-notaris-public-key.use-case';
import {
  type FindAllUsersQuery,
  type PaginatedResult,
} from '../../domains/repositories/user.repository.interface';
import { AuthenticatedUser } from '../../../auth/domains/entities/jwt-payload.entity';
import { EntityManager } from 'typeorm';
import { AuditLogService } from '../../../shared/audit/applications/services/audit-log.service';

@Injectable()
export class UserOrchestrator {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly findById: FindUserByIdUseCase,
    private readonly findByEmail: FindUserByEmailUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly updateAvatarUc: UpdateAvatarUseCase,
    private readonly adminCreateUserUc: AdminCreateUserUseCase,
    private readonly findAllUsersUc: FindAllUsersUseCase,
    private readonly registerPublicKeyUc: RegisterPublicKeyUseCase,
    private readonly getNotarisPublicKeyUc: GetNotarisPublicKeyUseCase,
    private readonly entityManager: EntityManager,
    private readonly auditLogService: AuditLogService,
  ) {}

  getById(
    id: string,
    requestingUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.findById.execute(id, requestingUser);
  }

  getByEmail(email: string): Promise<UserResponseDto> {
    return this.findByEmail.execute(email);
  }

  update(
    id: string,
    dto: UpdateUserDto,
    requestingUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.updateUser.execute(id, dto, requestingUser);
  }

  updateAvatar(userId: string, avatarUrl: string): Promise<UserResponseDto> {
    return this.updateAvatarUc.execute(userId, avatarUrl);
  }

  adminCreateUser(
    dto: AdminCreateUserDto,
  ): Promise<{ message: string; userId: string }> {
    return this.adminCreateUserUc.execute(dto);
  }

  findAll(
    query: FindAllUsersQuery = {},
  ): Promise<PaginatedResult<UserResponseDto>> {
    return this.findAllUsersUc.execute(query);
  }

  registerPublicKey(
    notarisId: string,
    dto: RegisterPublicKeyDto,
  ): Promise<{ message: string }> {
    return this.registerPublicKeyUc.execute(notarisId, dto);
  }

  getNotarisPublicKey(
    notarisId: string,
  ): Promise<{ notarisId: string; fullName: string; publicKey: string }> {
    return this.getNotarisPublicKeyUc.execute(notarisId);
  }

  async getNotaries(): Promise<{ id: string; fullName: string }[]> {
    const result = await this.findAllUsersUc.execute({
      role: 'NOTARIS',
      limit: 100,
    });
    return result.data.map((user) => ({
      id: user.id,
      fullName: user.fullName || user.email,
    }));
  }

  async getAdminDashboardStats(): Promise<{
    totalUsers: number;
    totalAssets: number;
    pendingAssets: number;
    criticalLogs: number;
  }> {
    // Gunakan query raw/TypeORM query builder via EntityManager
    // agar tidak perlu mengubah semua interface Repository di clean architecture
    const totalUsers = await this.entityManager.count('users', {
      where: { isActive: true },
    });

    const totalAssets = await this.entityManager.count('assets', {});
    const pendingAssets = await this.entityManager.count('assets', {
      where: { status: 'PENDING_VERIFICATION' },
    });

    // Ambil log severity CRITICAL (bisa pakai query DB atau AuditLogService jika terekspos)
    // AuditLogService di wt-backend menggunakan Mongoose.
    let criticalLogs = 0;
    try {
      const logs = await this.auditLogService.getPaginatedLogs({ severity: 'CRITICAL' as any, limit: 1 });
      criticalLogs = logs.total;
    } catch (err) {
      console.error('Failed to get critical logs count', err);
    }

    return {
      totalUsers,
      totalAssets,
      pendingAssets,
      criticalLogs,
    };
  }
}
