export class DeathVerificationDomain {
  constructor(
    public readonly id: string,
    public readonly pewarisId: string,
    public readonly documentUrl: string,
    public readonly submittedByUserId: string,
    public readonly verifiedByNotarisId: string | null,
    public readonly verifiedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  isVerified(): boolean {
    return this.verifiedAt !== null;
  }
}
