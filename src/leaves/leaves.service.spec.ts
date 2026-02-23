import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  leave: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  leaveBalance: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('LeavesService', () => {
  let service: LeavesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeavesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<LeavesService>(LeavesService);
  });

  describe('create', () => {
    const baseDto = {
      type: 'ANNUAL',
      startDate: '2025-07-01',
      endDate: '2025-07-05',
      days: 5,
      reason: 'Vacation',
    };

    it('should create a leave request successfully', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null); // no overlap
      mockPrisma.leave.create.mockResolvedValue({ id: 'l1', ...baseDto, status: 'PENDING' });

      const result = await service.create('c1', 'u1', baseDto as any);
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      const dto = { ...baseDto, startDate: '2025-07-10', endDate: '2025-07-05' };

      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping leaves', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create('c1', 'u1', baseDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);

      await expect(service.findOne('c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should return leave when found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', status: 'PENDING' });

      const result = await service.findOne('c1', 'l1');
      expect(result.id).toBe('l1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);

      await expect(service.update('c1', 'l1', 'u1', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when updating another users leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'other-user', status: 'PENDING' });

      await expect(service.update('c1', 'l1', 'u1', {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when leave is not PENDING', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'APPROVED' });

      await expect(service.update('c1', 'l1', 'u1', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should update a PENDING leave for own user', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', reason: 'Updated' });

      const result = await service.update('c1', 'l1', 'u1', { reason: 'Updated' } as any);
      expect(result.reason).toBe('Updated');
    });
  });

  describe('approve', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);

      await expect(service.approve('c1', 'bad', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-PENDING leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', status: 'APPROVED' });

      await expect(service.approve('c1', 'l1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should upsert leaveBalance for ANNUAL leave on approve', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'PENDING',
        type: 'ANNUAL',
        days: 5,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leaveBalance.upsert.mockResolvedValue({});
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'APPROVED' });

      await service.approve('c1', 'l1', 'admin');

      expect(mockPrisma.leaveBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { annualUsed: { increment: 5 } },
          create: expect.objectContaining({ annualTotal: 20, annualUsed: 5 }),
        }),
      );
    });

    it('should upsert leaveBalance for SICK leave on approve', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'PENDING',
        type: 'SICK',
        days: 3,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leaveBalance.upsert.mockResolvedValue({});
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'APPROVED' });

      await service.approve('c1', 'l1', 'admin');

      expect(mockPrisma.leaveBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { sickUsed: { increment: 3 } },
        }),
      );
    });

    it('should upsert leaveBalance for UNPAID leave on approve', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'PENDING',
        type: 'UNPAID',
        days: 2,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leaveBalance.upsert.mockResolvedValue({});
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'APPROVED' });

      await service.approve('c1', 'l1', 'admin');

      expect(mockPrisma.leaveBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { unpaidUsed: { increment: 2 } },
        }),
      );
    });

    it('should set approvedById and approvedAt on approve', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'PENDING',
        type: 'ANNUAL',
        days: 1,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leaveBalance.upsert.mockResolvedValue({});
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'APPROVED' });

      await service.approve('c1', 'l1', 'admin1');

      expect(mockPrisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            approvedById: 'admin1',
          }),
        }),
      );
    });
  });

  describe('reject', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);

      await expect(service.reject('c1', 'bad', 'admin', { rejectionNote: 'No' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-PENDING leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', status: 'APPROVED' });

      await expect(service.reject('c1', 'l1', 'admin', { rejectionNote: 'No' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should set status to REJECTED with rejectionNote', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', status: 'PENDING' });
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'REJECTED' });

      await service.reject('c1', 'l1', 'admin', { rejectionNote: 'Not enough staff' } as any);

      expect(mockPrisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectionNote: 'Not enough staff',
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);

      await expect(service.cancel('c1', 'bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when cancelling another users leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'other-user', status: 'PENDING' });

      await expect(service.cancel('c1', 'l1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-cancellable status', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'REJECTED' });

      await expect(service.cancel('c1', 'l1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should cancel PENDING leave without reversing balance', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'PENDING',
        type: 'ANNUAL',
        days: 5,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'CANCELLED' });

      await service.cancel('c1', 'l1', 'u1');

      // Balance should NOT be decremented for PENDING
      expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
      expect(mockPrisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED' },
        }),
      );
    });

    it('should reverse ANNUAL balance when cancelling APPROVED leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'APPROVED',
        type: 'ANNUAL',
        days: 5,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leaveBalance.update.mockResolvedValue({});
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'CANCELLED' });

      await service.cancel('c1', 'l1', 'u1');

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { annualUsed: { decrement: 5 } },
        }),
      );
    });

    it('should reverse SICK balance when cancelling APPROVED leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'APPROVED',
        type: 'SICK',
        days: 3,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leaveBalance.update.mockResolvedValue({});
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'CANCELLED' });

      await service.cancel('c1', 'l1', 'u1');

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { sickUsed: { decrement: 3 } },
        }),
      );
    });

    it('should reverse UNPAID balance when cancelling APPROVED leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'APPROVED',
        type: 'UNPAID',
        days: 2,
        startDate: new Date('2025-07-01'),
      });
      mockPrisma.leaveBalance.update.mockResolvedValue({});
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'CANCELLED' });

      await service.cancel('c1', 'l1', 'u1');

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { unpaidUsed: { decrement: 2 } },
        }),
      );
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);

      await expect(service.remove('c1', 'bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when deleting another users leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'other', status: 'PENDING' });

      await expect(service.remove('c1', 'l1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when deleting non-PENDING leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'APPROVED' });

      await expect(service.remove('c1', 'l1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should delete PENDING own leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      mockPrisma.leave.delete.mockResolvedValue({ id: 'l1' });

      const result = await service.remove('c1', 'l1', 'u1');
      expect(result.success).toBe(true);
    });
  });

  describe('getBalance', () => {
    it('should return existing balance', async () => {
      mockPrisma.leaveBalance.findUnique.mockResolvedValue({
        annualTotal: 20,
        annualUsed: 5,
        annualCarried: 3,
        sickUsed: 2,
        unpaidUsed: 1,
      });

      const result = await service.getBalance('c1', 'u1', 2025);

      expect(result.annual.total).toBe(23); // 20 + 3 carried
      expect(result.annual.used).toBe(5);
      expect(result.annual.remaining).toBe(18); // 23 - 5
      expect(result.annual.carried).toBe(3);
      expect(result.sick.used).toBe(2);
      expect(result.unpaid.used).toBe(1);
    });

    it('should create default balance when not exists', async () => {
      mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
      mockPrisma.leaveBalance.create.mockResolvedValue({
        annualTotal: 20,
        annualUsed: 0,
        annualCarried: 0,
        sickUsed: 0,
        unpaidUsed: 0,
      });

      const result = await service.getBalance('c1', 'u1', 2025);

      expect(result.annual.total).toBe(20);
      expect(result.annual.used).toBe(0);
      expect(result.annual.remaining).toBe(20);
      expect(mockPrisma.leaveBalance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ annualTotal: 20, annualUsed: 0 }),
        }),
      );
    });

    it('should default to current year when year not provided', async () => {
      mockPrisma.leaveBalance.findUnique.mockResolvedValue({
        annualTotal: 20,
        annualUsed: 0,
        annualCarried: 0,
        sickUsed: 0,
        unpaidUsed: 0,
      });

      const result = await service.getBalance('c1', 'u1');
      expect(result.year).toBe(new Date().getFullYear());
    });
  });

  describe('getSummary', () => {
    it('should return pending, approvedThisMonth, and onLeaveToday counts', async () => {
      mockPrisma.leave.count
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(7)  // approvedThisMonth
        .mockResolvedValueOnce(2); // onLeaveToday

      const result = await service.getSummary('c1');

      expect(result.pending).toBe(3);
      expect(result.approvedThisMonth).toBe(7);
      expect(result.onLeaveToday).toBe(2);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPrisma.leave.findMany.mockResolvedValue([{ id: 'l1' }]);
      mockPrisma.leave.count.mockResolvedValue(1);

      const result = await service.findAll('c1', { page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by status and type', async () => {
      mockPrisma.leave.findMany.mockResolvedValue([]);
      mockPrisma.leave.count.mockResolvedValue(0);

      await service.findAll('c1', { status: 'PENDING', type: 'ANNUAL', page: 1, limit: 20 } as any);

      const whereArg = mockPrisma.leave.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('PENDING');
      expect(whereArg.type).toBe('ANNUAL');
    });
  });

  describe('getMyLeaves', () => {
    it('should call findAll with userId filter', async () => {
      mockPrisma.leave.findMany.mockResolvedValue([]);
      mockPrisma.leave.count.mockResolvedValue(0);

      await service.getMyLeaves('c1', 'u1', { page: 1, limit: 20 } as any);

      const whereArg = mockPrisma.leave.findMany.mock.calls[0][0].where;
      expect(whereArg.userId).toBe('u1');
    });
  });
});
