// src/storage/infrastructures/listeners/file-uploaded.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FileUploadedEvent } from '../events/file-uploaded.event';

@Injectable()
export class FileUploadedListener {
  private readonly logger = new Logger(FileUploadedListener.name);

  @OnEvent('storage.file_uploaded', { async: true })
  handleFileUploaded(event: FileUploadedEvent): void {
    this.logger.log(
      `[EVENT] storage.file_uploaded → key=${event.fileKey}, ` +
        `userId=${event.userId}, context=${event.context}`,
    );
  }
}
