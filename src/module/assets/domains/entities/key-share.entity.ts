import { KeyShareHolder } from '../enums/key-share.enum';

export { KeyShareHolder };

export class KeyShareDomain {
  constructor(
    public readonly id: string,
    public readonly assetId: string,
    public readonly holder: KeyShareHolder,
    private readonly encryptedShare: string, // Bagian Shamir, terenkripsi-at-rest per-holder
    public readonly createdAt: Date,
  ) {}

  /** Bagian kunci terenkripsi. Jangan pernah expose mentah ke response API. */
  getEncryptedShare(): string {
    return this.encryptedShare;
  }
}
