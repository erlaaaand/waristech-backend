// src/auth/infrastructures/listeners/user-logged-in.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserLoggedInEvent } from '../events/user-logged-in.event';

@Injectable()
export class UserLoggedInListener {
  private readonly logger = new Logger(UserLoggedInListener.name);

  @OnEvent('auth.user_logged_in', { async: true })
  handleUserLoggedIn(event: UserLoggedInEvent): void {
    this.logger.log(
      `[EVENT] auth.user_logged_in → userId=${event.userId}, email=${event.email}`,
    );
  }
}
