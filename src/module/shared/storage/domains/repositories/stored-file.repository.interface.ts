import { StoredFileDomain } from '../entities/stored-file.entity';

export type ICreateStoredFileData = Omit<
  StoredFileDomain,
  'id' | 'createdAt' | 'isOwnedBy'
>;

export interface IStoredFileRepository {
  create(data: ICreateStoredFileData): Promise<StoredFileDomain>;
  findById(id: string): Promise<StoredFileDomain | null>;
  findByFileKey(fileKey: string): Promise<StoredFileDomain | null>;
  deleteById(id: string): Promise<void>;
}

export const STORED_FILE_REPOSITORY_TOKEN = Symbol('IStoredFileRepository');
