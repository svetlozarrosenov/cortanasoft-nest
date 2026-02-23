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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const MESSAGE_TTL_DAYS = 7;
let ChatService = ChatService_1 = class ChatService {
    prisma;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRooms(companyId, userId) {
        await this.verifyUserInCompany(companyId, userId);
        const rooms = await this.prisma.chatRoom.findMany({
            where: {
                companyId,
                participants: {
                    some: { userId },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
                messages: {
                    where: { isDeleted: false },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { lastMessageAt: 'desc' },
        });
        return Promise.all(rooms.map(async (room) => {
            const participant = room.participants.find((p) => p.userId === userId);
            const unreadCount = participant?.lastReadAt
                ? await this.prisma.chatMessage.count({
                    where: {
                        roomId: room.id,
                        createdAt: { gt: participant.lastReadAt },
                        senderId: { not: userId },
                        isDeleted: false,
                    },
                })
                : await this.prisma.chatMessage.count({
                    where: {
                        roomId: room.id,
                        senderId: { not: userId },
                        isDeleted: false,
                    },
                });
            return {
                ...room,
                unreadCount,
                lastMessage: room.messages[0] || null,
            };
        }));
    }
    async getOrCreateDirectRoom(companyId, userId, otherUserId) {
        await this.verifyUserInCompany(companyId, userId);
        await this.verifyUserInCompany(companyId, otherUserId);
        if (userId === otherUserId) {
            throw new common_1.BadRequestException('Cannot create chat with yourself');
        }
        const existingRoom = await this.prisma.chatRoom.findFirst({
            where: {
                companyId,
                type: 'DIRECT',
                AND: [
                    { participants: { some: { userId } } },
                    { participants: { some: { userId: otherUserId } } },
                ],
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        if (existingRoom) {
            return existingRoom;
        }
        return this.prisma.chatRoom.create({
            data: {
                type: 'DIRECT',
                companyId,
                createdById: userId,
                participants: {
                    create: [{ userId }, { userId: otherUserId }],
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async createGroupRoom(companyId, userId, dto) {
        await this.verifyUserInCompany(companyId, userId);
        for (const participantId of dto.participantIds) {
            await this.verifyUserInCompany(companyId, participantId);
        }
        const allParticipantIds = [...new Set([userId, ...dto.participantIds])];
        return this.prisma.chatRoom.create({
            data: {
                name: dto.name,
                type: 'GROUP',
                companyId,
                createdById: userId,
                participants: {
                    create: allParticipantIds.map((id) => ({
                        userId: id,
                        isAdmin: id === userId,
                    })),
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async getMessages(companyId, userId, roomId, page = 1, limit = 50) {
        const participant = await this.verifyParticipant(roomId, userId);
        const roomCompanyId = await this.getRoomCompanyId(roomId);
        if (roomCompanyId !== companyId) {
            throw new common_1.ForbiddenException('Room does not belong to this company');
        }
        const now = new Date();
        const [messages, total] = await Promise.all([
            this.prisma.chatMessage.findMany({
                where: {
                    roomId,
                    isDeleted: false,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: now } },
                    ],
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.chatMessage.count({
                where: {
                    roomId,
                    isDeleted: false,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: now } },
                    ],
                },
            }),
        ]);
        if (page === 1) {
            await this.markAsRead(roomId, userId);
        }
        return {
            data: messages.reverse(),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async sendMessage(companyId, userId, roomId, content) {
        await this.verifyParticipant(roomId, userId);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + MESSAGE_TTL_DAYS);
        const [message] = await this.prisma.$transaction([
            this.prisma.chatMessage.create({
                data: {
                    content,
                    roomId,
                    senderId: userId,
                    expiresAt,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.chatRoom.update({
                where: { id: roomId },
                data: { lastMessageAt: new Date() },
            }),
        ]);
        return message;
    }
    async markAsRead(roomId, userId) {
        await this.prisma.chatRoomParticipant.updateMany({
            where: {
                roomId,
                userId,
            },
            data: {
                lastReadAt: new Date(),
            },
        });
    }
    async editMessage(userId, messageId, content) {
        const message = await this.prisma.chatMessage.findUnique({
            where: { id: messageId },
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== userId) {
            throw new common_1.ForbiddenException('Can only edit your own messages');
        }
        if (message.isDeleted) {
            throw new common_1.BadRequestException('Cannot edit a deleted message');
        }
        return this.prisma.chatMessage.update({
            where: { id: messageId },
            data: {
                content,
                isEdited: true,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }
    async deleteMessage(userId, messageId) {
        const message = await this.prisma.chatMessage.findUnique({
            where: { id: messageId },
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== userId) {
            throw new common_1.ForbiddenException('Can only delete your own messages');
        }
        return this.prisma.chatMessage.update({
            where: { id: messageId },
            data: { isDeleted: true },
        });
    }
    async getCompanyUsers(companyId) {
        const userCompanies = await this.prisma.userCompany.findMany({
            where: { companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        isActive: true,
                    },
                },
            },
        });
        return userCompanies.filter((uc) => uc.user.isActive).map((uc) => uc.user);
    }
    async verifyUserInCompany(companyId, userId) {
        const userCompany = await this.prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
        if (!userCompany) {
            throw new common_1.ForbiddenException('User does not belong to this company');
        }
    }
    async verifyParticipant(roomId, userId) {
        const participant = await this.prisma.chatRoomParticipant.findUnique({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
        });
        if (!participant) {
            throw new common_1.ForbiddenException('Not a participant in this chat room');
        }
        return participant;
    }
    async getRoomParticipantIds(roomId) {
        const participants = await this.prisma.chatRoomParticipant.findMany({
            where: { roomId },
            select: { userId: true },
        });
        return participants.map((p) => p.userId);
    }
    async getRoomCompanyId(roomId) {
        const room = await this.prisma.chatRoom.findUnique({
            where: { id: roomId },
            select: { companyId: true },
        });
        return room?.companyId || null;
    }
    async cleanupExpiredMessages() {
        this.logger.log('Starting cleanup of expired chat messages...');
        try {
            const result = await this.prisma.chatMessage.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });
            this.logger.log(`Cleaned up ${result.count} expired chat messages`);
        }
        catch (error) {
            this.logger.error('Failed to cleanup expired messages:', error);
        }
    }
};
exports.ChatService = ChatService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatService.prototype, "cleanupExpiredMessages", null);
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map