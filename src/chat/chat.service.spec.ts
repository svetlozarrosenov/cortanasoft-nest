import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  chatRoom: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  chatRoomParticipant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  userCompany: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ChatService>(ChatService);
  });

  // Helper: make verifyUserInCompany pass
  const allowUser = (...userIds: string[]) => {
    for (const id of userIds) {
      mockPrisma.userCompany.findUnique.mockImplementation(({ where }) => {
        if (userIds.includes(where.userId_companyId.userId)) {
          return Promise.resolve({ userId: where.userId_companyId.userId });
        }
        return Promise.resolve(null);
      });
    }
  };

  // Helper: make verifyParticipant pass
  const allowParticipant = (roomId: string, userId: string) => {
    mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue({
      roomId,
      userId,
      lastReadAt: new Date(),
    });
  };

  describe('getOrCreateDirectRoom', () => {
    it('should return existing direct room if found', async () => {
      allowUser('u1', 'u2');
      const existingRoom = {
        id: 'room1',
        type: 'DIRECT',
        participants: [
          { userId: 'u1', user: { id: 'u1', firstName: 'A', lastName: 'B' } },
          { userId: 'u2', user: { id: 'u2', firstName: 'C', lastName: 'D' } },
        ],
      };
      mockPrisma.chatRoom.findFirst.mockResolvedValue(existingRoom);

      const result = await service.getOrCreateDirectRoom('c1', 'u1', 'u2');

      expect(result.id).toBe('room1');
      expect(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('should create new direct room if none exists', async () => {
      allowUser('u1', 'u2');
      mockPrisma.chatRoom.findFirst.mockResolvedValue(null);
      mockPrisma.chatRoom.create.mockResolvedValue({
        id: 'room-new',
        type: 'DIRECT',
        participants: [
          { userId: 'u1', user: { id: 'u1' } },
          { userId: 'u2', user: { id: 'u2' } },
        ],
      });

      const result = await service.getOrCreateDirectRoom('c1', 'u1', 'u2');

      expect(result.id).toBe('room-new');
      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DIRECT',
            companyId: 'c1',
            createdById: 'u1',
          }),
        }),
      );
    });

    it('should throw BadRequestException when chatting with yourself', async () => {
      allowUser('u1');

      await expect(
        service.getOrCreateDirectRoom('c1', 'u1', 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user not in company', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrCreateDirectRoom('c1', 'u1', 'u2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when other user not in company', async () => {
      mockPrisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'u1' }) // u1 passes
        .mockResolvedValueOnce(null); // u2 fails

      await expect(
        service.getOrCreateDirectRoom('c1', 'u1', 'u2'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createGroupRoom', () => {
    it('should create group room with creator as admin', async () => {
      allowUser('u1', 'u2', 'u3');
      mockPrisma.chatRoom.create.mockResolvedValue({
        id: 'grp1',
        name: 'Team',
        type: 'GROUP',
        participants: [
          { userId: 'u1', isAdmin: true },
          { userId: 'u2', isAdmin: false },
          { userId: 'u3', isAdmin: false },
        ],
      });

      const dto = { name: 'Team', type: 'GROUP' as const, participantIds: ['u2', 'u3'] };
      const result = await service.createGroupRoom('c1', 'u1', dto as any);

      expect(result.type).toBe('GROUP');
      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Team',
            type: 'GROUP',
            createdById: 'u1',
          }),
        }),
      );
    });

    it('should auto-include creator in participants', async () => {
      allowUser('u1', 'u2');
      mockPrisma.chatRoom.create.mockResolvedValue({ id: 'grp1' });

      // Creator u1 is NOT in participantIds but should be auto-added
      await service.createGroupRoom('c1', 'u1', {
        name: 'Chat',
        type: 'GROUP',
        participantIds: ['u2'],
      } as any);

      const createCall = mockPrisma.chatRoom.create.mock.calls[0][0];
      const createdParticipants = createCall.data.participants.create;
      const userIds = createdParticipants.map((p: any) => p.userId);
      expect(userIds).toContain('u1');
      expect(userIds).toContain('u2');
    });

    it('should deduplicate if creator is in participantIds', async () => {
      allowUser('u1', 'u2');
      mockPrisma.chatRoom.create.mockResolvedValue({ id: 'grp1' });

      await service.createGroupRoom('c1', 'u1', {
        name: 'Chat',
        type: 'GROUP',
        participantIds: ['u1', 'u2'],
      } as any);

      const createCall = mockPrisma.chatRoom.create.mock.calls[0][0];
      const createdParticipants = createCall.data.participants.create;
      // u1 should appear only once
      const u1Count = createdParticipants.filter((p: any) => p.userId === 'u1').length;
      expect(u1Count).toBe(1);
    });

    it('should throw ForbiddenException when participant not in company', async () => {
      mockPrisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'u1' }) // creator OK
        .mockResolvedValueOnce(null); // participant fails

      await expect(
        service.createGroupRoom('c1', 'u1', {
          participantIds: ['u-bad'],
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sendMessage', () => {
    it('should create message with 7-day expiration', async () => {
      allowParticipant('room1', 'u1');
      const mockMessage = {
        id: 'msg1',
        content: 'Hello',
        roomId: 'room1',
        senderId: 'u1',
        sender: { id: 'u1', firstName: 'John' },
      };
      mockPrisma.$transaction.mockResolvedValue([mockMessage, {}]);

      const result = await service.sendMessage('c1', 'u1', 'room1', 'Hello');

      expect(result.content).toBe('Hello');
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Verify the transaction contains message create and room update
      const transactionArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionArgs).toHaveLength(2);
    });

    it('should throw ForbiddenException when not a participant', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('c1', 'u1', 'room1', 'Hello'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages in chronological order', async () => {
      allowParticipant('room1', 'u1');
      mockPrisma.chatRoom.findUnique.mockResolvedValue({ companyId: 'c1' });

      const messages = [
        { id: 'msg2', content: 'World', createdAt: new Date('2026-02-21T10:01:00Z') },
        { id: 'msg1', content: 'Hello', createdAt: new Date('2026-02-21T10:00:00Z') },
      ];
      mockPrisma.chatMessage.findMany.mockResolvedValue(messages);
      mockPrisma.chatMessage.count.mockResolvedValue(2);
      mockPrisma.chatRoomParticipant.updateMany.mockResolvedValue({});

      const result = await service.getMessages('c1', 'u1', 'room1', 1, 50);

      // Messages should be reversed to chronological order
      expect(result.data[0].id).toBe('msg1');
      expect(result.data[1].id).toBe('msg2');
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should mark as read only on first page', async () => {
      allowParticipant('room1', 'u1');
      mockPrisma.chatRoom.findUnique.mockResolvedValue({ companyId: 'c1' });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);
      mockPrisma.chatMessage.count.mockResolvedValue(0);
      mockPrisma.chatRoomParticipant.updateMany.mockResolvedValue({});

      await service.getMessages('c1', 'u1', 'room1', 1, 50);
      expect(mockPrisma.chatRoomParticipant.updateMany).toHaveBeenCalledTimes(1);
    });

    it('should NOT mark as read on subsequent pages', async () => {
      allowParticipant('room1', 'u1');
      mockPrisma.chatRoom.findUnique.mockResolvedValue({ companyId: 'c1' });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);
      mockPrisma.chatMessage.count.mockResolvedValue(100);

      await service.getMessages('c1', 'u1', 'room1', 2, 50);
      expect(mockPrisma.chatRoomParticipant.updateMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when room belongs to different company', async () => {
      allowParticipant('room1', 'u1');
      mockPrisma.chatRoom.findUnique.mockResolvedValue({ companyId: 'c-other' });

      await expect(
        service.getMessages('c1', 'u1', 'room1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when not a participant', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages('c1', 'u1', 'room1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should filter out deleted messages', async () => {
      allowParticipant('room1', 'u1');
      mockPrisma.chatRoom.findUnique.mockResolvedValue({ companyId: 'c1' });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);
      mockPrisma.chatMessage.count.mockResolvedValue(0);
      mockPrisma.chatRoomParticipant.updateMany.mockResolvedValue({});

      await service.getMessages('c1', 'u1', 'room1');

      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        }),
      );
    });
  });

  describe('editMessage', () => {
    it('should edit own message and set isEdited flag', async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: 'msg1',
        senderId: 'u1',
        isDeleted: false,
      });
      mockPrisma.chatMessage.update.mockResolvedValue({
        id: 'msg1',
        content: 'Updated',
        isEdited: true,
      });

      const result = await service.editMessage('u1', 'msg1', 'Updated');

      expect(result.isEdited).toBe(true);
      expect(mockPrisma.chatMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { content: 'Updated', isEdited: true },
        }),
      );
    });

    it('should throw NotFoundException for non-existent message', async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue(null);

      await expect(
        service.editMessage('u1', 'bad', 'text'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when editing another users message', async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: 'msg1',
        senderId: 'u2', // different user
        isDeleted: false,
      });

      await expect(
        service.editMessage('u1', 'msg1', 'hacked'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when editing deleted message', async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: 'msg1',
        senderId: 'u1',
        isDeleted: true,
      });

      await expect(
        service.editMessage('u1', 'msg1', 'text'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete own message', async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: 'msg1',
        senderId: 'u1',
      });
      mockPrisma.chatMessage.update.mockResolvedValue({
        id: 'msg1',
        isDeleted: true,
      });

      const result = await service.deleteMessage('u1', 'msg1');

      expect(result.isDeleted).toBe(true);
      expect(mockPrisma.chatMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg1' },
        data: { isDeleted: true },
      });
    });

    it('should throw NotFoundException for non-existent message', async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteMessage('u1', 'bad'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when deleting another users message', async () => {
      mockPrisma.chatMessage.findUnique.mockResolvedValue({
        id: 'msg1',
        senderId: 'u2',
      });

      await expect(
        service.deleteMessage('u1', 'msg1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsRead', () => {
    it('should update lastReadAt for participant', async () => {
      mockPrisma.chatRoomParticipant.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('room1', 'u1');

      expect(mockPrisma.chatRoomParticipant.updateMany).toHaveBeenCalledWith({
        where: { roomId: 'room1', userId: 'u1' },
        data: { lastReadAt: expect.any(Date) },
      });
    });
  });

  describe('getRooms', () => {
    it('should return rooms with unread count', async () => {
      allowUser('u1');
      mockPrisma.chatRoom.findMany.mockResolvedValue([
        {
          id: 'room1',
          type: 'DIRECT',
          participants: [
            { userId: 'u1', lastReadAt: new Date('2026-02-20T00:00:00Z') },
            { userId: 'u2', lastReadAt: null },
          ],
          messages: [{ id: 'msg1', content: 'Last', sender: { id: 'u2' } }],
        },
      ]);
      // unread count for u1 (has lastReadAt)
      mockPrisma.chatMessage.count.mockResolvedValue(3);

      const result = await service.getRooms('c1', 'u1');

      expect(result).toHaveLength(1);
      expect(result[0].unreadCount).toBe(3);
      expect(result[0].lastMessage.id).toBe('msg1');
    });

    it('should count all non-own messages as unread when lastReadAt is null', async () => {
      allowUser('u1');
      mockPrisma.chatRoom.findMany.mockResolvedValue([
        {
          id: 'room1',
          type: 'DIRECT',
          participants: [
            { userId: 'u1', lastReadAt: null }, // never read
          ],
          messages: [],
        },
      ]);
      mockPrisma.chatMessage.count.mockResolvedValue(10);

      const result = await service.getRooms('c1', 'u1');

      expect(result[0].unreadCount).toBe(10);
      // Should count messages without lastReadAt filter
      expect(mockPrisma.chatMessage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roomId: 'room1',
            senderId: { not: 'u1' },
            isDeleted: false,
          }),
        }),
      );
    });

    it('should throw ForbiddenException when user not in company', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(service.getRooms('c1', 'u-bad')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getCompanyUsers', () => {
    it('should return only active users', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([
        { user: { id: 'u1', firstName: 'John', lastName: 'Doe', isActive: true } },
        { user: { id: 'u2', firstName: 'Jane', lastName: 'Smith', isActive: false } },
        { user: { id: 'u3', firstName: 'Bob', lastName: 'Brown', isActive: true } },
      ]);

      const result = await service.getCompanyUsers('c1');

      expect(result).toHaveLength(2);
      expect(result.map((u: any) => u.id)).toEqual(['u1', 'u3']);
    });

    it('should return empty array when no users', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([]);

      const result = await service.getCompanyUsers('c1');
      expect(result).toHaveLength(0);
    });
  });

  describe('getRoomParticipantIds', () => {
    it('should return all participant user IDs', async () => {
      mockPrisma.chatRoomParticipant.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ]);

      const result = await service.getRoomParticipantIds('room1');

      expect(result).toEqual(['u1', 'u2', 'u3']);
    });
  });

  describe('getRoomCompanyId', () => {
    it('should return the rooms company ID', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue({ companyId: 'c1' });

      const result = await service.getRoomCompanyId('room1');
      expect(result).toBe('c1');
    });

    it('should return null when room not found', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);

      const result = await service.getRoomCompanyId('bad');
      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredMessages', () => {
    it('should delete messages where expiresAt < now', async () => {
      mockPrisma.chatMessage.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredMessages();

      expect(mockPrisma.chatMessage.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.chatMessage.deleteMany.mockRejectedValue(new Error('DB error'));

      // Should not throw — logs error instead
      await expect(service.cleanupExpiredMessages()).resolves.not.toThrow();
    });
  });

  describe('verifyParticipant', () => {
    it('should return participant when found', async () => {
      const participant = { roomId: 'room1', userId: 'u1', lastReadAt: new Date() };
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(participant);

      const result = await service.verifyParticipant('room1', 'u1');
      expect(result).toEqual(participant);
    });

    it('should throw ForbiddenException when not participant', async () => {
      mockPrisma.chatRoomParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyParticipant('room1', 'u1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
