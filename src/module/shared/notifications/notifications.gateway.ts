import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Sesuaikan origin frontend
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

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      // Dapatkan token JWT dari query string atau header
      const token = (client.handshake.auth.token ||
        client.handshake.query.token) as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'fallback_secret',
      }) as unknown as { sub?: string; id?: string };

      const userId = (payload.sub || payload.id) as string;

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

  handleDisconnect(client: Socket) {
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
  sendToUser(userId: string, event: string, data: unknown) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.length > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Fungsi untuk broadcast (misalnya pengumuman massal)
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
