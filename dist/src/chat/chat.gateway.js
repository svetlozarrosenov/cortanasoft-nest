"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
const common_1 = require("@nestjs/common");
let ChatGateway = class ChatGateway {
    chatService;
    jwtService;
    server;
    logger = new common_1.Logger('ChatGateway');
    userConnections = new Map();
    constructor(chatService, jwtService) {
        this.chatService = chatService;
        this.jwtService = jwtService;
    }
    afterInit() {
        this.logger.log('Chat WebSocket Gateway initialized');
    }
    isUserOnline(companyId, userId) {
        return (this.userConnections.get(companyId)?.get(userId) ?? 0) > 0;
    }
    getOnlineUserIds(companyId) {
        const companyConnections = this.userConnections.get(companyId);
        if (!companyConnections)
            return [];
        return Array.from(companyConnections.entries())
            .filter(([, count]) => count > 0)
            .map(([userId]) => userId);
    }
    async handleConnection(client) {
        this.logger.log(`New connection attempt from ${client.id}`);
        this.logger.log(`Headers: ${JSON.stringify(client.handshake.headers.origin)}`);
        this.logger.log(`Query: ${JSON.stringify(client.handshake.query)}`);
        this.logger.log(`Cookies present: ${!!client.handshake.headers.cookie}`);
        try {
            let token = client.handshake.query.token ||
                client.handshake.auth?.token ||
                client.handshake.headers.authorization?.replace('Bearer ', '');
            this.logger.log(`Token from query/auth/header: ${token ? 'present' : 'not found'}`);
            if (!token && client.handshake.headers.cookie) {
                const cookies = client.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
                    const trimmed = cookie.trim();
                    const eqIndex = trimmed.indexOf('=');
                    if (eqIndex !== -1) {
                        const key = trimmed.substring(0, eqIndex);
                        const value = trimmed.substring(eqIndex + 1);
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                token = cookies['access_token'];
                this.logger.log(`Token from cookies: ${token ? 'present' : 'not found'}`);
            }
            if (!token) {
                this.logger.warn('Connection rejected: No token provided');
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;
            client.companyId = client.handshake.query.companyId;
            if (!client.companyId) {
                this.logger.warn('Connection rejected: No companyId provided');
                client.disconnect();
                return;
            }
            client.join(`company:${client.companyId}`);
            client.join(`user:${client.companyId}:${client.userId}`);
            if (client.userId) {
                if (!this.userConnections.has(client.companyId)) {
                    this.userConnections.set(client.companyId, new Map());
                }
                const companyConnections = this.userConnections.get(client.companyId);
                const currentCount = companyConnections.get(client.userId) ?? 0;
                const wasOffline = currentCount === 0;
                companyConnections.set(client.userId, currentCount + 1);
                if (wasOffline) {
                    this.server.to(`company:${client.companyId}`).emit('userOnline', {
                        userId: client.userId,
                    });
                }
            }
            this.logger.log(`Client connected: ${client.id} (User: ${client.userId}, Company: ${client.companyId})`);
        }
        catch (error) {
            this.logger.error('Connection error:', error.message);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        if (client.userId && client.companyId) {
            const companyConnections = this.userConnections.get(client.companyId);
            if (companyConnections) {
                const currentCount = companyConnections.get(client.userId) ?? 0;
                const newCount = Math.max(0, currentCount - 1);
                companyConnections.set(client.userId, newCount);
                if (newCount === 0) {
                    this.server.to(`company:${client.companyId}`).emit('userOffline', {
                        userId: client.userId,
                    });
                }
            }
            this.logger.log(`Client disconnected: ${client.id}`);
        }
    }
    async handleJoinRoom(client, data) {
        if (!client.userId)
            return;
        try {
            await this.chatService.verifyParticipant(data.roomId, client.userId);
        }
        catch {
            this.logger.warn(`User ${client.userId} tried to join room ${data.roomId} without being a participant`);
            return { success: false, error: 'Not a participant in this room' };
        }
        client.join(`room:${data.roomId}`);
        this.logger.log(`User ${client.userId} joined room ${data.roomId}`);
        await this.chatService.markAsRead(data.roomId, client.userId);
        return { success: true };
    }
    handleLeaveRoom(client, data) {
        if (!client.userId)
            return;
        client.leave(`room:${data.roomId}`);
        this.logger.log(`User ${client.userId} left room ${data.roomId}`);
        return { success: true };
    }
    async handleSendMessage(client, data) {
        if (!client.userId || !client.companyId) {
            this.logger.warn('sendMessage rejected: missing userId or companyId');
            return { success: false, error: 'Not authenticated' };
        }
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
        this.logger.log(`sendMessage from user ${client.userId} to room ${data.roomId}: ${trimmedContent.substring(0, 50)}`);
        try {
            const message = await this.chatService.sendMessage(client.companyId, client.userId, data.roomId, trimmedContent);
            this.logger.log(`Message saved with id: ${message.id}`);
            const participantIds = await this.chatService.getRoomParticipantIds(data.roomId);
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
        }
        catch (error) {
            this.logger.error('Send message error:', error.message);
            return { success: false, error: error.message };
        }
    }
    handleTyping(client, data) {
        if (!client.userId)
            return;
        client.to(`room:${data.roomId}`).emit('userTyping', {
            userId: client.userId,
            isTyping: data.isTyping,
        });
    }
    async handleMarkRead(client, data) {
        if (!client.userId)
            return;
        await this.chatService.markAsRead(data.roomId, client.userId);
        return { success: true };
    }
    handleGetOnlineUsers(client) {
        if (!client.companyId)
            return;
        return { users: this.getOnlineUserIds(client.companyId) };
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leaveRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('markRead'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getOnlineUsers'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleGetOnlineUsers", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://127.0.0.1:3000',
                    process.env.FRONTEND_URL,
                ].filter(Boolean);
                if (!origin) {
                    return callback(null, true);
                }
                const isLocalNetwork = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d+\.\d+:\d+$/.test(origin);
                if (allowedOrigins.includes(origin) || isLocalNetwork) {
                    callback(null, true);
                }
                else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
        },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map