import { UserRole } from '../enums/user.enum';
import { CalculationMethod } from '../../../../calculation/domains/enums/calculation.enum';

export { UserRole };

export class UserDomain {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly fullName: string,
    public readonly nik: string | null,
    public readonly avatarUrl: string | null,
    public readonly phoneNumber: string,
    public readonly isActive: boolean,
    public readonly role: UserRole,
    public readonly isEmailVerified: boolean,
    public readonly otpCode: string | null,
    public readonly otpExpiresAt: Date | null,
    public readonly resetPasswordOtp: string | null,
    public readonly resetPasswordOtpExpiresAt: Date | null,
    public readonly lastCheckInAt: Date,
    public readonly proofOfLifeEscalatedAt: Date | null,
    public readonly preferredCalculationMethod: CalculationMethod | null,
    public readonly consentGivenAt: Date | null,
    public readonly consentVersion: string | null,
    /** Public key Notaris (PEM/SPKI base64) untuk enkripsi bagian kunci miliknya. */
    public readonly publicKey: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /** Apakah pengguna sudah memberi persetujuan eksplisit pemrosesan data pribadi (UU PDP). */
  hasGivenConsent(): boolean {
    return this.consentGivenAt !== null;
  }
}
