// src/shared/storage/infrastructures/adapters/cloudinary-storage.adapter.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { RawUploadedFile } from '../../domains/entities/stored-file.entity';
import { IStorageAdapter, UploadResult } from './storage.adapter.interface';

@Injectable()
export class CloudinaryStorageAdapter implements IStorageAdapter {
  private readonly logger: Logger = new Logger(CloudinaryStorageAdapter.name);

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
    this.logger.log('[Cloudinary] Adapter diinisialisasi.');
  }

  async upload(file: RawUploadedFile, fileKey: string): Promise<UploadResult> {
    return new Promise<UploadResult>((resolve, reject) => {
      // fileKey biasanya berisi path: 'context/userId/uuid.ext'
      // Untuk Cloudinary, folder dan public_id bisa dipisah
      const pathParts = fileKey.split('/');
      const filenameWithExt = pathParts.pop() || '';
      const folderPath = pathParts.join('/');
      const publicId = filenameWithExt.split('.').slice(0, -1).join('.');

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderPath || 'general',
          public_id: publicId,
          resource_type: 'auto',
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            this.logger.error(`[Cloudinary] Upload failed → ${error.message}`);
            return reject(
              new InternalServerErrorException(
                `Gagal mengupload file ke Cloudinary: ${error.message}`,
              ),
            );
          }

          if (!result) {
            return reject(
              new InternalServerErrorException(
                'Gagal mengupload file ke Cloudinary: Response kosong',
              ),
            );
          }

          this.logger.log(`[Cloudinary] File uploaded → ${result.secure_url}`);

          // Masukkan data hasil upload ke dalam objek UploadResult
          // provider kita set ke 'cloudinary' (akan ditambahkan ke type StorageProvider)
          const uploadResult: UploadResult = {
            fileKey: result.public_id,
            fileUrl: result.secure_url,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeInBytes: file.sizeInBytes,
            provider: 'cloudinary',
          };

          resolve(uploadResult);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(fileKey: string): Promise<void> {
    try {
      // fileKey di Cloudinary menyimpan public_id lengkap dengan foldernya
      // Karena resource_type 'auto' saat upload, file non-gambar (seperti pdf) disimpan sebagai type 'raw' atau 'image'
      // Kita coba menghapus dengan tipe 'image' terlebih dahulu.
      const result = (await cloudinary.uploader.destroy(
        fileKey,
      )) as unknown as { result: string };
      this.logger.log(
        `[Cloudinary] Hapus file ${fileKey} → status: ${result.result}`,
      );

      // Jika tidak berhasil/tidak ditemukan, coba hapus dengan resource_type 'raw'
      if (result.result === 'not_found') {
        const rawResult = (await cloudinary.uploader.destroy(fileKey, {
          resource_type: 'raw',
        })) as unknown as { result: string };
        this.logger.log(
          `[Cloudinary] Hapus raw file ${fileKey} → status: ${rawResult.result}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[Cloudinary] Gagal menghapus berkas ${fileKey} → ${message}`,
      );
    }
  }

  buildPublicUrl(fileKey: string): string {
    // Membangun URL secure dari Cloudinary
    return cloudinary.url(fileKey, { secure: true });
  }
}
