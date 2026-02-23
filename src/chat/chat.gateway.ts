import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
}

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const isLocalNetwork =
        /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d+\.\d+:\d+$/.test(
          origin,
        );

      if (allowedOrigins.includes(origin) || isLocalNetwork) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  // Track connection count per user per company to handle multiple tabs
  private userConnections: Map<string, Map<string, number>> = new Map(); // companyId -> Map<userId, connectionCount>

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  afterInit() {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  // Helper: check if user is online (has at least 1 connection)
  private isUserOnline(companyId: string, userId: string): boolean {
    return (this.userConnections.get(companyId)?.get(userId) ?? 0) > 0;
  }

  // Helper: get all online user IDs for a company
  private getOnlineUserIds(companyId: string): string[] {
    const companyConnections = this.userConnections.get(companyId);
    if (!companyConnections) return [];
    return Array.from(companyConnections.entries())
      .filter(([, count]) => count > 0)
      .map(([userId]) => userId);
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`New connection attempt from ${client.id}`);
    this.logger.log(
      `Headers: ${JSON.stringify(client.handshake.headers.origin)}`,
    );
    this.logger.log(`Query: ${JSON.stringify(client.handshake.query)}`);
    this.logger.log(`Cookies present: ${!!client.handshake.headers.cookie}`);

    try {
      // Extract token from query, auth header, or cookies
      let token =
        (client.handshake.query.token as string) ||
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      this.logger.log(
        `Token from query/auth/header: ${token ? 'present' : 'not found'}`,
      );

      // Try to extract from cookies if not found
      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';').reduce(
          (acc, cookie) => {
            const trimmed = cookie.trim();
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex !== -1) {
              const key = trimmed.substring(0, eqIndex);
              const value = trimmed.substring(eqIndex + 1);
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>,
        );
        token = cookies['access_token'];
        this.logger.log(
          `Token from cookies: ${token ? 'present' : 'not found'}`,
        );
      }

      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.companyId = client.handshake.query.companyId as string;

      if (!client.companyId) {
        this.logger.warn('Connection rejected: No companyId provided');
        client.disconnect();
        return;
      }

      // Join company room for broadcasts (online status, etc.)
      client.join(`company:${client.companyId}`);

      // Join personal channel for direct messages
      // This ensures user receives messages even without opening a specific chat
      client.join(`user:${client.companyId}:${client.userId}`);

      // Track online user - increment connection count
      if (client.userId) {
        if (!this.userConnections.has(client.companyId)) {
          this.userConnections.set(client.companyId, new Map());
        }
        const companyConnections = this.userConnections.get(client.companyId)!;
        const currentCount = companyConnections.get(client.userId) ?? 0;
        const wasOffline = currentCount === 0;
        companyConnections.set(client.userId, currentCount + 1);

        // Only broadcast online status if user was previously offline
        if (wasOffline) {
          this.server.to(`company:${client.companyId}`).emit('userOnline', {
            userId: client.userId,
          });
        }
      }

      this.logger.log(
        `Client connected: ${client.id} (User: ${client.userId}, Company: ${client.companyId})`,
      );
    } catch (error) {
      this.logger.error('Connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId && client.companyId) {
      // Decrement connection count
      const companyConnections = this.userConnections.get(client.companyId);
      if (companyConnections) {
        const currentCount = companyConnections.get(client.userId) ?? 0;
        const newCount = Math.max(0, currentCount - 1);
        companyConnections.set(client.userId, newCount);

        // Only broadcast offline status if no more connections remain
        if (newCount === 0) {
          this.server.to(`company:${client.companyId}`).emit('userOffline', {
            userId: client.userId,
          });
        }
      }

      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  // Join a specific chat room
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) return;

    // Verify user is a participant in this room before joining
    try {
      await this.chatService.verifyParticipant(data.roomId, client.userId);
    } catch {
      this.logger.warn(
        `User ${client.userId} tried to join room ${data.roomId} without being a participant`,
      );
      return { success: false, error: 'Not a participant in this room' };
    }

    client.join(`room:${data.roomId}`);
    this.logger.log(`User ${client.userId} joined room ${data.roomId}`);

    // Mark messages as read
    await this.chatService.markAsRead(data.roomId, client.userId);

    return { success: true };
  }

  // Leave a chat room
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) return;

    client.leave(`room:${data.roomId}`);
    this.logger.log(`User ${client.userId} left room ${data.roomId}`);

    return { success: true };
  }

  // Send a message
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    if (!client.userId || !client.companyId) {
      this.logger.warn('sendMessage rejected: missing userId or companyId');
      return { success: false, error: 'Not authenticated' };
    }

    // Validate message content
    if (!data.content || typeof data.content !== 'string') {
      return { success: false, error: 'Message content is required' };
    }
    const trimmedContent = data.content.trim();
    if (trimmedContent.length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }
    if (trimmedContent.length > 5000) {
      return { success: false, error: 'Message too long (max 5000 characters)' };
    }

    this.logger.log(
      `sendMessage from user ${client.userId} to room ${data.roomId}: ${trimmedContent.substring(0, 50)}`,
    );

    try {
      const message = await this.chatService.sendMessage(
        client.companyId,
        client.userId,
        data.roomId,
        trimmedContent,
      );

      this.logger.log(`Message saved with id: ${message.id}`);

      // Get all participants in the room
      const participantIds = await this.chatService.getRoomParticipantIds(
        data.roomId,
      );

      // Send message to each participant's personal channel
      for (const participantId of participantIds) {
        const userChannel = `user:${client.companyId}:${participantId}`;
        this.server.to(userChannel).emit('newMessage', message);
        this.server.to(userChannel).emit('roomUpdated', {
          roomId: data.roomId,
          lastMessage: message,
        });
        this.logger.log(`Message sent to channel: ${userChannel}`);
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error('Send message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Typing indicator
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;

    client.to(`room:${data.roomId}`).emit('userTyping', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  // Mark messages as read
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) return;

    await this.chatService.markAsRead(data.roomId, client.userId);

    return { success: true };
  }

  // Get online users
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.companyId) return;

    return { users: this.getOnlineUserIds(client.companyId) };
  }
}
