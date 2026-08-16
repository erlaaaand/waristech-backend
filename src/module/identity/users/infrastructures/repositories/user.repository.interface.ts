// src/users/infrastructures/repositories/user.repository.interface.ts
import { UserEntity } from '../../domains/entities/user.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FindAllUsersQuery {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByIdWithPassword(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<UserEntity>;
  findAll(): Promise<UserEntity[]>;
  findAllPaginated(
    query: FindAllUsersQuery,
  ): Promise<PaginatedResult<UserEntity>>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  softDelete(id: string): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}

export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');
