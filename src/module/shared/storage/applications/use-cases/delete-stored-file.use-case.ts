import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  type IStorageAdapter,
  STORAGE_ADAPTER_TOKEN,
} from '../../infrastructures/adapters/storage.adapter.interface';
import {
  type IStoredFileRepository,
  STORED_FILE_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/stored-file.repository.interface';

@Injectable()
export class DeleteStoredFileUseCase {
  constructor(
    @Inject(STORED_FILE_REPOSITORY_TOKEN)
    private readonly storedFileRepo: IStoredFileRepository,
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(storedFileId: string, requestingUserId: string): Promise<void> {
    // 1. Cari data file di database
    const fileEntity = await this.storedFileRepo.findById(storedFileId);
    if (!fileEntity) {
      throw new NotFoundException(
        `File dengan id '${storedFileId}' tidak ditemukan`,
      );
    }

    // 2. Validasi kepemilikan (peserta hanya bisa hapus filenya sendiri)
    if (fileEntity.userId !== requestingUserId) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk menghapus file ini',
      );
    }

    // 3. Hard Delete dari Storage Fisik (Hostinger / S3)
    await this.storageAdapter.delete(fileEntity.fileKey);

    // 4. Hard Delete dari Database
    await this.storedFileRepo.deleteById(storedFileId);

    // 5. Emit event (opsional, berguna untuk audit log)
    this.eventEmitter.emit('storage.file_deleted', {
      fileKey: fileEntity.fileKey,
      userId: fileEntity.userId,
      occurredAt: new Date(),
    });
  }
}
