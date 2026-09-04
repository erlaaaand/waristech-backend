import { FilePurpose, StorageProvider } from '../enums/stored-file.enum';

export { FilePurpose, type StorageProvider };

export class StoredFileDomain {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly fileKey: string,
    public readonly fileUrl: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly sizeInBytes: number,
    public readonly purpose: FilePurpose,
    public readonly provider: StorageProvider,
    public readonly createdAt: Date,
  ) {}

  isOwnedBy(userId: string): boolean {
    return this.userId === userId;
  }
}

export class RawUploadedFile {
  buffer: Buffer = Buffer.alloc(0);
  originalName: string = '';
  mimeType: string = '';
  sizeInBytes: number = 0;
}
