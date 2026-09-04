import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDomain, UserRole } from '../../domains/entities/user.entity';
import { UserTypeOrmEntity } from '../entities/user.typeorm-entity';
import {
  IUserRepository,
  type FindAllUsersQuery,
  type ICreateUserData,
  type IUpdateUserData,
  type PaginatedResult,
} from '../../domains/repositories/user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly ormRepo: Repository<UserTypeOrmEntity>,
  ) {}

  private toDomain(entity: UserTypeOrmEntity): UserDomain {
    return new UserDomain(
      entity.id,
      entity.email,
      entity.password,
      entity.fullName,
      entity.nik,
      entity.avatarUrl,
      entity.phoneNumber,
      entity.isActive,
      entity.role,
      entity.isEmailVerified,
      entity.otpCode,
      entity.otpExpiresAt,
      entity.resetPasswordOtp,
      entity.resetPasswordOtpExpiresAt,
      entity.lastCheckInAt,
      entity.proofOfLifeEscalatedAt,
      entity.preferredCalculationMethod,
      entity.consentGivenAt,
      entity.consentVersion,
      entity.publicKey,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  async findById(id: string): Promise<UserDomain | null> {
    const entity = await this.ormRepo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByIdWithPassword(id: string): Promise<UserDomain | null> {
    const entity = await this.ormRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<UserDomain | null> {
    const entity = await this.ormRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<UserDomain[]> {
    const entities = await this.ormRepo.find({ where: { isActive: true } });
    return entities.map((e) => this.toDomain(e));
  }

  async findAllPaginated(
    query: FindAllUsersQuery,
  ): Promise<PaginatedResult<UserDomain>> {
    const { page = 1, limit = 10, role, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.ormRepo.createQueryBuilder('user').where('1=1');

    if (search) {
      qb.andWhere('(user.fullName LIKE :search OR user.email LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    const [entities, total] = await qb
      .orderBy('user.role', 'ASC')
      .addOrderBy('user.fullName', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: entities.map((e) => this.toDomain(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: ICreateUserData): Promise<UserDomain> {
    const entity = this.ormRepo.create(data);
    const saved = await this.ormRepo.save(entity);
    return this.toDomain(saved);
  }

  async update(id: string, data: IUpdateUserData): Promise<UserDomain> {
    await this.ormRepo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User dengan id ${id} tidak ditemukan setelah update`);
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.ormRepo.update(id, { isActive: false });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.ormRepo.count({ where: { email } });
    return count > 0;
  }

  async existsByNik(nik: string): Promise<boolean> {
    const count = await this.ormRepo.count({ where: { nik } });
    return count > 0;
  }

  async findOverdueCheckIns(checkpointThreshold: Date): Promise<UserDomain[]> {
    const qb = this.ormRepo.createQueryBuilder('user');
    qb.where('user.role = :role', { role: UserRole.PEWARIS });
    qb.andWhere('user.isActive = :isActive', { isActive: true });
    qb.andWhere('user.lastCheckInAt < :checkpointThreshold', {
      checkpointThreshold,
    });

    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }
}
