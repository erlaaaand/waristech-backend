import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../events/user-created.event';

@Injectable()
export class UserCreatedListener {
  private readonly logger = new Logger(UserCreatedListener.name);

  @OnEvent('user.created', { async: true })
  handleUserCreatedEvent(event: UserCreatedEvent): void {
    this.logger.log(
      `[EVENT] user.created → userId=${event.userId}, email=${event.email}`,
    );
  }
}
