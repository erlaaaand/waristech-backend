import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as secrets from 'secrets.js-grempe';
import {
  ISecretSharingService,
  type SplitShareResult,
} from '../../domains/services/secret-sharing.service.interface';
import { KeyShareHolder } from '../../domains/enums/key-share.enum';
import { InvalidKeyShareFormatException } from '../../domains/exceptions/asset.exception';

const TOTAL_SHARES = 3;
const THRESHOLD = 2;
const SHARE_HOLDERS_IN_ORDER = [
  KeyShareHolder.EXECUTOR,
  KeyShareHolder.NOTARIS,
  KeyShareHolder.SYSTEM,
];

/**
 * Implementasi Shamir's Secret Sharing (2-dari-3) via `secrets.js-grempe`.
 *
 * Service ini SENGAJA tidak memiliki kemampuan merekonstruksi rahasia.
 * Server hanya menyimpan bagian SYSTEM (1 dari 3) — bagian EXECUTOR dan
 * NOTARIS dikembalikan sekali ke pemiliknya dan tidak pernah dipersistensikan
 * dalam bentuk yang dapat dibaca server. Penggabungan kunci dilakukan klien.
 */
@Injectable()
export class SecretSharingService implements ISecretSharingService {
  private readonly algorithm = 'aes-256-ctr';
  // Demo purpose — di produksi wajib dari secret manager (KMS/Vault).
  private readonly pepper = crypto
    .createHash('sha256')
    .update('WarisTech-SecretSharing-Pepper-2026')
    .digest();

  splitSecret(plainText: string): Promise<SplitShareResult[]> {
    const hex = secrets.str2hex(plainText);
    const rawShares = secrets.share(hex, TOTAL_SHARES, THRESHOLD);

    return Promise.resolve(
      rawShares.map((rawShare, index) => ({
        holder: SHARE_HOLDERS_IN_ORDER[index],
        rawShare,
      })),
    );
  }

  sealSystemShare(rawShare: string, assetId: string): string {
    const key = this.deriveSystemKey(assetId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(rawShare, 'utf8'),
      cipher.final(),
    ]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  unsealSystemShare(sealedShare: string, assetId: string): string {
    const [ivHex, contentHex] = sealedShare.split(':');
    if (!ivHex || !contentHex) {
      throw new InvalidKeyShareFormatException(
        'Format bagian kunci SYSTEM tidak valid.',
      );
    }
    const key = this.deriveSystemKey(assetId);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(contentHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /**
   * Kunci enkripsi-at-rest untuk bagian SYSTEM saja. Ini melindungi bagian
   * tersebut dari pembacaan langsung isi tabel, BUKAN dari server itu sendiri —
   * jaminan sesungguhnya datang dari fakta bahwa server cuma punya 1 dari 3 bagian.
   */
  private deriveSystemKey(assetId: string): Buffer {
    return crypto
      .createHmac('sha256', this.pepper)
      .update(`${assetId}:${KeyShareHolder.SYSTEM}`)
      .digest();
  }
}
