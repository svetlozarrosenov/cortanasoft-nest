import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

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
  userCompany: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
};

const mockUploads = {
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  deleteFile: jest.fn(),
};

const mockPush = {
  sendToUser: jest.fn().mockResolvedValue({ success: 0, failed: 0 }),
  sendToUsers: jest.fn().mockResolvedValue({ success: 0, failed: 0 }),
};

// Future dates so the "no past dates" guard doesn't trip in create tests
const FUTURE_START = '2030-07-01';
const FUTURE_END = '2030-07-05';

describe('LeavesService', () => {
  let service: LeavesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Defaults: company is a CLIENT, employee exists, no approvers, balance empty
    mockPrisma.company.findUnique.mockResolvedValue({
      role: 'CLIENT',
      defaultAnnualLeaveDays: 20,
    });
    mockPrisma.userCompany.findUnique.mockResolvedValue({
      id: 'uc1',
      maxVacationDays: 20,
      role: { permissions: { modules: {} } },
    });
    mockPrisma.userCompany.findMany.mockResolvedValue([]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
    mockPrisma.leaveBalance.upsert.mockResolvedValue({
      annualTotal: 20,
      annualTotalOverride: null,
      annualUsed: 0,
      annualCarried: 0,
      sickUsed: 0,
      unpaidUsed: 0,
    });
    mockPrisma.leaveBalance.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeavesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UploadsService, useValue: mockUploads },
        { provide: PushNotificationsService, useValue: mockPush },
      ],
    }).compile();
    service = module.get<LeavesService>(LeavesService);
  });

  describe('create', () => {
    const baseDto = {
      type: 'ANNUAL',
      startDate: FUTURE_START,
      endDate: FUTURE_END,
      days: 5,
      reason: 'Vacation',
    };

    it('should create a leave request successfully', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null); // no overlap
      mockPrisma.leave.create.mockResolvedValue({
        id: 'l1',
        ...baseDto,
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
        status: 'PENDING',
        user: { firstName: 'Ivan', lastName: 'Petrov' },
      });

      const result = await service.create('c1', 'u1', baseDto as any);
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      const dto = { ...baseDto, startDate: '2030-07-10', endDate: '2030-07-05' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for a start date in the past (non-privileged)', async () => {
      const dto = { ...baseDto, startDate: '2020-01-06', endDate: '2020-01-10' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should require a reason for UNPAID leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      const dto = { ...baseDto, type: 'UNPAID', reason: '' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should require a sick note for SICK leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      const dto = { ...baseDto, type: 'SICK', reason: 'flu' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping leaves', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.create('c1', 'u1', baseDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should forbid filing on behalf of another user when not privileged', async () => {
      const dto = { ...baseDto, userId: 'someone-else' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(service.findOne('c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should return leave when found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      const result = await service.findOne('c1', 'l1');
      expect(result.id).toBe('l1');
    });

    it('should mask sensitive fields of others for non-privileged viewers', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'owner',
        status: 'PENDING',
        reason: 'secret',
        documentNumber: 'E123',
      });
      const result = await service.findOne('c1', 'l1', { userId: 'viewer', privileged: false });
      expect(result.reason).toBeNull();
      expect(result.documentNumber).toBeNull();
    });

    it('should not mask own leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'viewer',
        status: 'PENDING',
        reason: 'secret',
      });
      const result = await service.findOne('c1', 'l1', { userId: 'viewer', privileged: false });
      expect(result.reason).toBe('secret');
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
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING', type: 'ANNUAL' });
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', reason: 'Updated' });
      const result = await service.update('c1', 'l1', 'u1', { reason: 'Updated' } as any);
      expect(result.reason).toBe('Updated');
    });
  });

  describe('approve', () => {
    const annualLeave = {
      id: 'l1',
      userId: 'u1',
      status: 'PENDING',
      type: 'ANNUAL',
      days: 5,
      halfDay: false,
      startDate: new Date(FUTURE_START),
      endDate: new Date(FUTURE_END),
    };

    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(service.approve('c1', 'bad', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-PENDING leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', status: 'APPROVED' });
      await expect(service.approve('c1', 'l1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should forbid self-approval', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(annualLeave);
      await expect(service.approve('c1', 'l1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw when annual balance is insufficient', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(annualLeave);
      mockPrisma.leaveBalance.upsert.mockResolvedValue({
        annualTotal: 0,
        annualTotalOverride: null,
        annualUsed: 0,
        annualCarried: 0,
      });
      await expect(service.approve('c1', 'l1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should decrement balance and set approver on approve', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(annualLeave);
      mockPrisma.leave.update.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'APPROVED',
        type: 'ANNUAL',
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
      });

      await service.approve('c1', 'l1', 'admin1');

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { annualUsed: { increment: expect.any(Number) } },
        }),
      );
      expect(mockPrisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approvedById: 'admin1' }),
        }),
      );
      expect(mockPush.sendToUser).toHaveBeenCalled();
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

    it('should forbid self-rejection', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      await expect(service.reject('c1', 'l1', 'u1', { rejectionNote: 'x' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('should set status to REJECTED with rejectionNote', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      mockPrisma.leave.update.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'REJECTED',
        type: 'ANNUAL',
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
      });

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

    it('should reverse balance when cancelling an approved annual leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'APPROVED',
        type: 'ANNUAL',
        halfDay: false,
        days: 5,
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
      });
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'CANCELLED' });

      await service.cancel('c1', 'l1', 'u1');

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { annualUsed: { increment: expect.any(Number) } },
        }),
      );
    });
  });

  describe('getBalance', () => {
    it('should return a computed balance structure', async () => {
      mockPrisma.leaveBalance.upsert.mockResolvedValue({
        annualTotal: 20,
        annualTotalOverride: null,
        annualUsed: 5,
        annualCarried: 2,
        sickUsed: 1,
        unpaidUsed: 0,
      });

      const balance = await service.getBalance('c1', 'u1', 2030);
      expect(balance.annual.total).toBe(22);
      expect(balance.annual.remaining).toBe(17);
      expect(balance.annual.used).toBe(5);
    });
  });
});
