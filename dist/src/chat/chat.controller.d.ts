import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateRoomDto, SendMessageDto } from './dto';
export declare class ChatController {
    private chatService;
    private chatGateway;
    constructor(chatService: ChatService, chatGateway: ChatGateway);
    getRooms(companyId: string, req: any): Promise<{
        unreadCount: number;
        lastMessage: {
            sender: {
                id: string;
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
        participants: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            userId: string;
            joinedAt: Date;
            roomId: string;
            lastReadAt: Date | null;
            isAdmin: boolean;
        })[];
        messages: ({
            sender: {
                id: string;
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
        })[];
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ChatRoomType;
        companyId: string;
        createdById: string | null;
        lastMessageAt: Date | null;
    }[]>;
    getOrCreateDirectRoom(companyId: string, otherUserId: string, req: any): Promise<{
        participants: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            userId: string;
            joinedAt: Date;
            roomId: string;
            lastReadAt: Date | null;
            isAdmin: boolean;
        })[];
    } & {
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ChatRoomType;
        companyId: string;
        createdById: string | null;
        lastMessageAt: Date | null;
    }>;
    createGroupRoom(companyId: string, dto: CreateRoomDto, req: any): Promise<{
        participants: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            userId: string;
            joinedAt: Date;
            roomId: string;
            lastReadAt: Date | null;
            isAdmin: boolean;
        })[];
    } & {
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ChatRoomType;
        companyId: string;
        createdById: string | null;
        lastMessageAt: Date | null;
    }>;
    getMessages(companyId: string, roomId: string, page: string | undefined, limit: string | undefined, req: any): Promise<{
        data: ({
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    sendMessage(companyId: string, roomId: string, dto: SendMessageDto, req: any): Promise<{
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
    }>;
    editMessage(messageId: string, dto: SendMessageDto, req: any): Promise<{
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
    }>;
    deleteMessage(messageId: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        isDeleted: boolean;
        roomId: string;
        senderId: string;
        isEdited: boolean;
        expiresAt: Date | null;
    }>;
    getCompanyUsers(companyId: string): Promise<{
        id: string;
        isActive: boolean;
        email: string;
        firstName: string;
        lastName: string;
    }[]>;
    markAsRead(roomId: string, req: any): Promise<{
        success: boolean;
    }>;
}
