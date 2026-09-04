import { UserDomain } from '../entities/user.entity';

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

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

export type ICreateUserData = Pick<UserDomain, 'email' | 'password'> &
  Partial<
    Pick<
      UserDomain,
      | 'fullName'
      | 'nik'
      | 'phoneNumber'
      | 'role'
      | 'otpCode'
      | 'otpExpiresAt'
      | 'isEmailVerified'
      | 'isActive'
      | 'consentGivenAt'
      | 'consentVersion'
    >
  >;

export type IUpdateUserData = Partial<
  Pick<
    Mutable<UserDomain>,
    | 'fullName'
    | 'password'
    | 'avatarUrl'
    | 'role'
    | 'isActive'
    | 'isEmailVerified'
    | 'otpCode'
    | 'otpExpiresAt'
    | 'resetPasswordOtp'
    | 'resetPasswordOtpExpiresAt'
    | 'lastCheckInAt'
    | 'proofOfLifeEscalatedAt'
    | 'preferredCalculationMethod'
    | 'consentGivenAt'
    | 'consentVersion'
    | 'publicKey'
  >
>;

export interface IUserRepository {
  findById(id: string): Promise<UserDomain | null>;
  findByIdWithPassword(id: string): Promise<UserDomain | null>;
  findByEmail(email: string): Promise<UserDomain | null>;
  findAll(): Promise<UserDomain[]>;
  findAllPaginated(
    query: FindAllUsersQuery,
  ): Promise<PaginatedResult<UserDomain>>;
  create(data: ICreateUserData): Promise<UserDomain>;
  update(id: string, data: IUpdateUserData): Promise<UserDomain>;
  softDelete(id: string): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
  existsByNik(nik: string): Promise<boolean>;

  /** Pewaris aktif yang checkpoint Proof-of-Life-nya (>30 hari) sudah lewat. */
  findOverdueCheckIns(checkpointThreshold: Date): Promise<UserDomain[]>;
}

export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');
