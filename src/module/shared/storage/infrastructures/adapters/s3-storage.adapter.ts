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

    // Hanya validasi dan inisialisasi S3 / Supabase jika provider diatur ke 's3' atau 'supabase'
    if (provider === 's3' || provider === 'supabase') {
      this.region =
        this.config.get<string>('AWS_REGION') ??
        this.config.get<string>('SUPABASE_S3_REGION') ??
        'ap-southeast-1';
      this.bucket =
        this.config.get<string>('AWS_S3_BUCKET') ??
        this.config.get<string>('SUPABASE_STORAGE_BUCKET') ??
        '';
      this.cdnBaseUrl =
        this.config.get<string>('AWS_CLOUDFRONT_URL') ??
        this.config.get<string>('SUPABASE_STORAGE_URL') ??
        null;

      const accessKeyId =
        this.config.get<string>('AWS_ACCESS_KEY_ID') ??
        this.config.get<string>('SUPABASE_S3_ACCESS_KEY_ID') ??
        '';
      const secretAccessKey =
        this.config.get<string>('AWS_SECRET_ACCESS_KEY') ??
        this.config.get<string>('SUPABASE_S3_SECRET_ACCESS_KEY') ??
        '';
      const endpoint =
        this.config.get<string>('AWS_S3_ENDPOINT') ??
        this.config.get<string>('SUPABASE_S3_ENDPOINT');

      const s3Config: S3ClientConfig = {
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint,
        forcePathStyle: true,
      };

      this.client = new S3Client(s3Config);
      this.logger.log(
        `[S3/Supabase Storage] Adapter diinisialisasi pada region: ${this.region}`,
      );
    } else {
      // Fallback aman untuk strict mode jika provider = 'local'
      this.region = '';
      this.bucket = '';
      this.cdnBaseUrl = null;
      this.client = undefined;
    }
  }

  /**
   * Pola pesan error yang bersifat SEMENTARA (worth retry) — termasuk
   * "The connection to the database timed out", yang BUKAN database kita
   * sendiri, melainkan galat internal dari backend storage penyedia (mis.
   * Supabase Storage berbasis Postgres yang sempat "cold start"/timeout).
   * AWS SDK sendiri sudah retry error jaringan standar secara internal,
   * tapi pesan non-standar seperti ini tidak selalu dikenali sebagai
   * retryable oleh SDK, jadi kita tambah lapis retry sendiri di sini.
   */
  private static readonly TRANSIENT_ERROR_PATTERNS = [
    'timed out',
    'timeout',
    'econnreset',
    'econnrefused',
    'networkingerror',
    'socket hang up',
    '503',
    '504',
  ];

  private isTransientError(message: string): boolean {
    const lower = message.toLowerCase();
    return S3StorageAdapter.TRANSIENT_ERROR_PATTERNS.some((p) =>
      lower.includes(p),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async upload(file: RawUploadedFile, fileKey: string): Promise<UploadResult> {
    // Guard clause: Pastikan client tersedia
    if (!this.client) {
      throw new InternalServerErrorException(
        'S3 Client tidak diinisialisasi karena STORAGE_PROVIDER bukan s3',
      );
    }

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

    const maxAttempts = 3;
    let lastMessage = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const command = new PutObjectCommand(putCommandInput);
        await this.client.send(command);

        this.logger.log(
          `[S3] File uploaded → s3://${this.bucket}/${fileKey}` +
            (attempt > 1 ? ` (percobaan ke-${attempt})` : ''),
        );

        return {
          fileKey,
          fileUrl: this.buildPublicUrl(fileKey),
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeInBytes: file.sizeInBytes,
          provider: 's3',
        };
      } catch (err: unknown) {
        lastMessage = err instanceof Error ? err.message : String(err);
        const isLastAttempt = attempt === maxAttempts;
        const transient = this.isTransientError(lastMessage);

        this.logger.error(
          `[S3] Upload gagal (percobaan ${attempt}/${maxAttempts}) → ${lastMessage}` +
            (transient && !isLastAttempt ? ' — mencoba ulang...' : ''),
        );

        if (!transient || isLastAttempt) {
          break;
        }

        // Backoff singkat: 500ms, lalu 1500ms.
        await this.sleep(attempt === 1 ? 500 : 1500);
      }
    }

    if (
      lastMessage.includes('NetworkingError') ||
      lastMessage.includes('ECONNREFUSED')
    ) {
      throw new ServiceUnavailableException(
        'AWS S3 tidak dapat dijangkau saat ini',
      );
    }

    throw new InternalServerErrorException(
      `Gagal mengupload file ke S3: ${lastMessage}`,
    );
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
