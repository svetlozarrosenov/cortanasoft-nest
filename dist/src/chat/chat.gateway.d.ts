import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
interface AuthenticatedSocket extends Socket {
    userId?: string;
    companyId?: string;
}
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private chatService;
    private jwtService;
    server: Server;
    private logger;
    private userConnections;
    constructor(chatService: ChatService, jwtService: JwtService);
    afterInit(): void;
    private isUserOnline;
    private getOnlineUserIds;
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleJoinRoom(client: AuthenticatedSocket, data: {
        roomId: string;
    }): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    } | undefined>;
    handleLeaveRoom(client: AuthenticatedSocket, data: {
        roomId: string;
    }): {
        success: boolean;
    } | undefined;
    handleSendMessage(client: AuthenticatedSocket, data: {
        roomId: string;
        content: string;
    }): Promise<{
        success: boolean;
        message: {
            sender: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            isDeleted: boolean;
            roomId: string;
            senderId: string;
            isEdited: boolean;
            expiresAt: Date | null;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
    handleTyping(client: AuthenticatedSocket, data: {
        roomId: string;
        isTyping: boolean;
    }): void;
    handleMarkRead(client: AuthenticatedSocket, data: {
        roomId: string;
    }): Promise<{
        success: boolean;
    } | undefined>;
    handleGetOnlineUsers(client: AuthenticatedSocket): {
        users: string[];
    } | undefined;
}
export {};
