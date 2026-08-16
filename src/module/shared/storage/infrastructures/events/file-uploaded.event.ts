// src/storage/infrastructures/events/file-uploaded.event.ts
export class FileUploadedEvent {
  constructor(
    public readonly fileKey: string,
    public readonly imageUrl: string,
    public readonly userId: string,
    public readonly context: string,
    public readonly occurredAt: Date,
  ) {}
}
