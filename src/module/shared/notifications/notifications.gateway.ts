import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  // Map untuk melacak user ID dengan socket ID
  private userSockets: Map<string, string[]> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      // Dapatkan token JWT dari handshake auth atau query
      const authHeader = client.handshake.auth?.token as string | undefined;
      const queryToken = client.handshake.query?.token as string | undefined;
      const token = authHeader || queryToken;

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = this.jwtService.verify<{ sub?: string; id?: string }>(
        token,
        { secret },
      );

      const userId = payload.sub || payload.id;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Simpan pemetaan userId dengan socket.id (mendukung multiple devices)
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId)?.push(client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    // Hapus socket dari pemetaan saat putus
    this.userSockets.forEach((sockets, userId) => {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        }
      }
    });
  }

  // Fungsi untuk mengirim notifikasi ke user tertentu
  sendToUser(userId: string, event: string, data: unknown): void {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.length > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Fungsi untuk broadcast (misalnya pengumuman massal)
  broadcast(event: string, data: unknown): void {
    this.server.emit(event, data);
  }
}
