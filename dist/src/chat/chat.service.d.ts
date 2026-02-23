import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto';
export declare class ChatService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getRooms(companyId: string, userId: string): Promise<{
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
    getOrCreateDirectRoom(companyId: string, userId: string, otherUserId: string): Promise<{
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
    createGroupRoom(companyId: string, userId: string, dto: CreateRoomDto): Promise<{
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
    getMessages(companyId: string, userId: string, roomId: string, page?: number, limit?: number): Promise<{
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
    sendMessage(companyId: string, userId: string, roomId: string, content: string): Promise<{
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
    markAsRead(roomId: string, userId: string): Promise<void>;
    editMessage(userId: string, messageId: string, content: string): Promise<{
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
    deleteMessage(userId: string, messageId: string): Promise<{
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
    private verifyUserInCompany;
    verifyParticipant(roomId: string, userId: string): Promise<{
        id: string;
        userId: string;
        joinedAt: Date;
        roomId: string;
        lastReadAt: Date | null;
        isAdmin: boolean;
    }>;
    getRoomParticipantIds(roomId: string): Promise<string[]>;
    getRoomCompanyId(roomId: string): Promise<string | null>;
    cleanupExpiredMessages(): Promise<void>;
}
