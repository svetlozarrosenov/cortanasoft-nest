import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateRoomDto, ChatRoomType } from './dto';

// Message TTL in days
const MESSAGE_TTL_DAYS = 7;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  // Get all chat rooms for a user in a company
  async getRooms(companyId: string, userId: string) {
    // Verify user belongs to company
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

    // Calculate unread count for each room
    return Promise.all(
      rooms.map(async (room) => {
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
      }),
    );
  }

  // Get or create direct chat room between two users
  async getOrCreateDirectRoom(
    companyId: string,
    userId: string,
    otherUserId: string,
  ) {
    // Verify both users belong to company
    await this.verifyUserInCompany(companyId, userId);
    await this.verifyUserInCompany(companyId, otherUserId);

    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create chat with yourself');
    }

    // Find existing direct room
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

    // Create new direct room
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

  // Create a group chat room
  async createGroupRoom(companyId: string, userId: string, dto: CreateRoomDto) {
    // Verify creator belongs to company
    await this.verifyUserInCompany(companyId, userId);

    // Verify all participants belong to company
    for (const participantId of dto.participantIds) {
      await this.verifyUserInCompany(companyId, participantId);
    }

    // Ensure creator is in participants
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

  // Get messages for a room
  async getMessages(
    companyId: string,
    userId: string,
    roomId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    // Verify user is participant and room belongs to the company
    const participant = await this.verifyParticipant(roomId, userId);
    const roomCompanyId = await this.getRoomCompanyId(roomId);
    if (roomCompanyId !== companyId) {
      throw new ForbiddenException('Room does not belong to this company');
    }

    const now = new Date();
    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: {
          roomId,
          isDeleted: false,
          // Filter out expired messages
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

    // Mark as read only on first page to avoid re-marking on pagination
    if (page === 1) {
      await this.markAsRead(roomId, userId);
    }

    return {
      data: messages.reverse(), // Return in chronological order
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Send a message
  async sendMessage(
    companyId: string,
    userId: string,
    roomId: string,
    content: string,
  ) {
    // Verify user is participant
    await this.verifyParticipant(roomId, userId);

    // Calculate expiration date (7 days from now)
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

  // Mark messages as read
  async markAsRead(roomId: string, userId: string) {
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

  // Edit a message
  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only edit your own messages');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message');
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

  // Delete a message (soft delete)
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  // Get online users in a company (for presence)
  async getCompanyUsers(companyId: string) {
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

  // Helper: Verify user belongs to company
  private async verifyUserInCompany(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not belong to this company');
    }
  }

  // Verify user is participant in room (public for use by gateway)
  async verifyParticipant(roomId: string, userId: string) {
    const participant = await this.prisma.chatRoomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a participant in this chat room');
    }

    return participant;
  }

  // Get all participant user IDs for a room
  async getRoomParticipantIds(roomId: string): Promise<string[]> {
    const participants = await this.prisma.chatRoomParticipant.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }

  // Get room's company ID
  async getRoomCompanyId(roomId: string): Promise<string | null> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { companyId: true },
    });
    return room?.companyId || null;
  }

  // Cron job to clean up expired messages (runs daily at 3 AM)
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
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
    } catch (error) {
      this.logger.error('Failed to cleanup expired messages:', error);
    }
  }
}
