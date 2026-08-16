// src/shared/storage/infrastructures/adapters/storage.adapter.interface.ts
import { RawUploadedFile } from '../../domains/entities/stored-file.entity';
import { StorageProvider } from '../../domains/entities/stored-file.entity';

export interface UploadResult {
  fileKey: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  sizeInBytes: number;
  provider: StorageProvider;
}

export interface IStorageAdapter {
  upload(file: RawUploadedFile, fileKey: string): Promise<UploadResult>;
  delete(fileKey: string): Promise<void>;
  buildPublicUrl(fileKey: string): string;
}

export const STORAGE_ADAPTER_TOKEN = Symbol('IStorageAdapter');
