import { Injectable } from '@nestjs/common';
import { IEncryptionService } from '../../domains/services/encryption.service.interface';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService implements IEncryptionService {
  // Demo purpose. In production, use ConfigService to get this secret.
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey = crypto
    .createHash('sha256')
    .update(String('WarisTech-Super-Secret-Key-2026'))
    .digest('base64')
    .substring(0, 32);

  encrypt(plainText: string): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
    return Promise.resolve(
      `${iv.toString('hex')}:${encrypted.toString('hex')}`,
    );
  }

  decrypt(cipherText: string): Promise<string> {
    const [ivHex, contentHex] = cipherText.split(':');
    if (!ivHex || !contentHex)
      return Promise.reject(new Error('Invalid cipher format'));
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      iv,
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(contentHex, 'hex')),
      decipher.final(),
    ]);
    return Promise.resolve(decrypted.toString());
  }
}
