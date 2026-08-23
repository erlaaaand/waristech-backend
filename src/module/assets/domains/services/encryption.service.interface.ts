export const ENCRYPTION_SERVICE_TOKEN = Symbol('IEncryptionService');

export interface IEncryptionService {
  encrypt(plainText: string): Promise<string>;
  decrypt(cipherText: string): Promise<string>;
}
