// src/users/infrastructures/events/user-created.event.ts
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly fullName: string | null,
    public readonly occurredAt: Date,
  ) {}
}
