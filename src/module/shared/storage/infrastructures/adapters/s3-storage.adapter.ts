// src/shared/storage/infrastructures/adapters/s3-storage.adapter.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type {
  S3ClientConfig,
  PutObjectCommandInput,
  DeleteObjectCommandInput,
} from '@aws-sdk/client-s3';
import { RawUploadedFile } from '../../domains/entities/stored-file.entity';
import type {
  IStorageAdapter,
  UploadResult,
} from './storage.adapter.interface';

@Injectable()
export class S3StorageAdapter implements IStorageAdapter {
  private readonly logger: Logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client | undefined;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnBaseUrl: string | null;

  constructor(private readonly config: ConfigService) {
    const provider = this.config.get<string>('STORAGE_PROVIDER', 'local');

    // Hanya validasi dan inisialisasi S3 jika provider diatur ke 's3'
    if (provider === 's3') {
      this.region = this.config.getOrThrow<string>('AWS_REGION');
      this.bucket = this.config.getOrThrow<string>('AWS_S3_BUCKET');
      this.cdnBaseUrl = this.config.get<string>('AWS_CLOUDFRONT_URL') ?? null;

      const s3Config: S3ClientConfig = {
        region: this.region,
        credentials: {
          accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.config.getOrThrow<string>(
            'AWS_SECRET_ACCESS_KEY',
          ),
        },
        endpoint: this.config.get<string>('AWS_S3_ENDPOINT'),
        forcePathStyle: true,
      };

      this.client = new S3Client(s3Config);
      this.logger.log(
        `[S3] Adapter diinisialisasi pada region: ${this.region}`,
      );
    } else {
      // Fallback aman untuk strict mode jika provider = 'local'
      this.region = '';
      this.bucket = '';
      this.cdnBaseUrl = null;
      this.client = undefined;
    }
  }

  async upload(file: RawUploadedFile, fileKey: string): Promise<UploadResult> {
    // Guard clause: Pastikan client tersedia
    if (!this.client) {
      throw new InternalServerErrorException(
        'S3 Client tidak diinisialisasi karena STORAGE_PROVIDER bukan s3',
      );
    }

    try {
      const putCommandInput: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimeType,
        ContentLength: file.sizeInBytes,
        Metadata: {
          originalName: encodeURIComponent(file.originalName),
        },
      };

      const command = new PutObjectCommand(putCommandInput);
      await this.client.send(command);

      this.logger.log(`[S3] File uploaded → s3://${this.bucket}/${fileKey}`);

      const result: UploadResult = {
        fileKey,
        fileUrl: this.buildPublicUrl(fileKey),
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeInBytes: file.sizeInBytes,
        provider: 's3',
      };

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[S3] Upload failed → ${message}`);

      if (
        message.includes('NetworkingError') ||
        message.includes('ECONNREFUSED')
      ) {
        throw new ServiceUnavailableException(
          'AWS S3 tidak dapat dijangkau saat ini',
        );
      }

      throw new InternalServerErrorException(
        `Gagal mengupload file ke S3: ${message}`,
      );
    }
  }

  async delete(fileKey: string): Promise<void> {
    // Guard clause: Pastikan client tersedia
    if (!this.client) {
      this.logger.warn(`[S3] Batal menghapus ${fileKey}, adapter tidak aktif.`);
      return;
    }

    try {
      const deleteCommandInput: DeleteObjectCommandInput = {
        Bucket: this.bucket,
        Key: fileKey,
      };

      const command = new DeleteObjectCommand(deleteCommandInput);
      await this.client.send(command);

      this.logger.log(`[S3] File deleted → s3://${this.bucket}/${fileKey}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[S3] Delete failed → ${message}`);
    }
  }

  buildPublicUrl(fileKey: string): string {
    if (this.cdnBaseUrl !== null) {
      return `${this.cdnBaseUrl}/${fileKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;
  }
}
