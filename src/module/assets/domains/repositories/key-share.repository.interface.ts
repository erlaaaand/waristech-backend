import { KeyShareDomain } from '../entities/key-share.entity';
import { KeyShareHolder } from '../enums/key-share.enum';

export const KEY_SHARE_REPOSITORY_TOKEN = Symbol('IKeyShareRepository');

export interface ICreateKeyShareData {
  holder: KeyShareHolder;
  encryptedShare: string;
}

/**
 * Server HANYA boleh menyimpan dua hal:
 *  - holder SYSTEM  : bagian Shamir tersegel kunci server (server bisa membuka).
 *  - holder NOTARIS : ciphertext hasil enkripsi dengan public key Notaris
 *                     (server TIDAK bisa membuka — hanya dititipkan).
 * Bagian holder EXECUTOR tidak pernah dipersistensikan dalam bentuk apa pun.
 */
export interface IKeyShareRepository {
  createMany(
    assetId: string,
    shares: ICreateKeyShareData[],
  ): Promise<KeyShareDomain[]>;
  findByAssetId(assetId: string): Promise<KeyShareDomain[]>;
  findByAssetIdAndHolder(
    assetId: string,
    holder: KeyShareHolder,
  ): Promise<KeyShareDomain | null>;
  deleteByAssetId(assetId: string): Promise<void>;
}
