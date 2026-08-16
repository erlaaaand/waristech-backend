// src/storage/infrastructures/providers/storage-adapter.provider.ts
import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_ADAPTER_TOKEN } from '../adapters/storage.adapter.interface';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { S3StorageAdapter } from '../adapters/s3-storage.adapter';
import { CloudinaryStorageAdapter } from '../adapters/cloudinary-storage.adapter';
import type { IStorageAdapter } from '../adapters/storage.adapter.interface';

/**
 * Provider dinamis — membaca STORAGE_PROVIDER dari env.
 * Nilai: 'local' | 's3' | 'cloudinary'
 * Default: 'local'
 *
 * Untuk switch provider: cukup ubah env var, zero code change.
 */
export const StorageAdapterProvider: Provider = {
  provide: STORAGE_ADAPTER_TOKEN,
  inject: [
    ConfigService,
    LocalStorageAdapter,
    S3StorageAdapter,
    CloudinaryStorageAdapter,
  ],
  useFactory: (
    config: ConfigService,
    localAdapter: LocalStorageAdapter,
    s3Adapter: S3StorageAdapter,
    cloudinaryAdapter: CloudinaryStorageAdapter,
  ): IStorageAdapter => {
    const provider = config.get<string>('STORAGE_PROVIDER', 'local');

    if (provider === 's3') {
      return s3Adapter;
    }

    if (provider === 'cloudinary') {
      return cloudinaryAdapter;
    }

    return localAdapter;
  },
};
