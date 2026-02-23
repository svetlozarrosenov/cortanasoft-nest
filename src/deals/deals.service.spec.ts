import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DealsService } from './deals.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  deal: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
};

describe('DealsService', () => {
  let service: DealsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DealsService>(DealsService);
  });

  describe('create', () => {
    const baseDto = { name: 'Test Deal' };

    it('should create a deal with provided currencyId (no company lookup)', async () => {
      const dto = { ...baseDto, currencyId: 'cur-eur' };
      mockPrisma.deal.create.mockResolvedValue({ id: 'd1', ...dto, companyId: 'c1' });

      const result = await service.create('c1', dto as any, 'u1');

      expect(result.currencyId).toBe('cur-eur');
      // Should NOT look up company currency since currencyId was provided
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('should fallback to company default currency when currencyId is not provided', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ currencyId: 'cur-bgn' });
      mockPrisma.deal.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'd1', ...data }),
      );

      const result = await service.create('c1', baseDto as any, 'u1');

      expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        select: { currencyId: true },
      });
      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currencyId: 'cur-bgn' }),
        }),
      );
    });

    it('should handle company with no default currency', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ currencyId: null });
      mockPrisma.deal.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'd1', ...data }),
      );

      await service.create('c1', baseDto as any);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currencyId: undefined }),
        }),
      );
    });

    it('should set companyId and createdById', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ currencyId: null });
      mockPrisma.deal.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'd1', ...data }),
      );

      await service.create('c1', baseDto as any, 'user-123');

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'c1',
            createdById: 'user-123',
          }),
        }),
      );
    });

    it('should parse expectedCloseDate as Date', async () => {
      const dto = { ...baseDto, expectedCloseDate: '2026-03-15', currencyId: 'cur1' };
      mockPrisma.deal.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'd1', ...data }),
      );

      await service.create('c1', dto as any);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expectedCloseDate: new Date('2026-03-15'),
          }),
        }),
      );
    });

    it('should include currency relation in response', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ currencyId: 'cur1' });
      mockPrisma.deal.create.mockResolvedValue({ id: 'd1', currency: { id: 'cur1', code: 'BGN' } });

      await service.create('c1', baseDto as any);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ currency: true }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return deal when found', async () => {
      const deal = { id: 'd1', companyId: 'c1', name: 'Deal', currency: { code: 'BGN' } };
      mockPrisma.deal.findFirst.mockResolvedValue(deal);

      const result = await service.findOne('c1', 'd1');
      expect(result.id).toBe('d1');
      expect(mockPrisma.deal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1', companyId: 'c1' },
        }),
      );
    });

    it('should throw NotFoundException when deal not found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      await expect(service.findOne('c1', 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update deal and return with currency', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({ id: 'd1', companyId: 'c1' });
      mockPrisma.deal.update.mockResolvedValue({
        id: 'd1',
        currencyId: 'cur-eur',
        currency: { id: 'cur-eur', code: 'EUR' },
      });

      const result = await service.update('c1', 'd1', { currencyId: 'cur-eur' } as any);
      expect(result.currencyId).toBe('cur-eur');
      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ currency: true }),
        }),
      );
    });

    it('should throw NotFoundException when updating non-existent deal', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      await expect(service.update('c1', 'bad', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should parse expectedCloseDate and actualCloseDate', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({ id: 'd1', companyId: 'c1' });
      mockPrisma.deal.update.mockResolvedValue({ id: 'd1' });

      await service.update('c1', 'd1', {
        expectedCloseDate: '2026-06-01',
        actualCloseDate: '2026-05-15',
      } as any);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expectedCloseDate: new Date('2026-06-01'),
            actualCloseDate: new Date('2026-05-15'),
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete deal', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({ id: 'd1', companyId: 'c1' });
      mockPrisma.deal.delete.mockResolvedValue({ id: 'd1' });

      await service.remove('c1', 'd1');
      expect(mockPrisma.deal.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });

    it('should throw NotFoundException for non-existent deal', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      await expect(service.remove('c1', 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should set actualCloseDate when CLOSED_WON', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({ id: 'd1', companyId: 'c1' });
      mockPrisma.deal.update.mockResolvedValue({ id: 'd1', status: 'CLOSED_WON' });

      await service.updateStatus('c1', 'd1', 'CLOSED_WON' as any);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CLOSED_WON',
            actualCloseDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should set actualCloseDate and lostReason when CLOSED_LOST', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({ id: 'd1', companyId: 'c1' });
      mockPrisma.deal.update.mockResolvedValue({ id: 'd1', status: 'CLOSED_LOST' });

      await service.updateStatus('c1', 'd1', 'CLOSED_LOST' as any, 'Too expensive');

      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CLOSED_LOST',
            actualCloseDate: expect.any(Date),
            lostReason: 'Too expensive',
          }),
        }),
      );
    });

    it('should NOT set actualCloseDate for non-closing statuses', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({ id: 'd1', companyId: 'c1' });
      mockPrisma.deal.update.mockResolvedValue({ id: 'd1', status: 'NEGOTIATION' });

      await service.updateStatus('c1', 'd1', 'NEGOTIATION' as any);

      const updateCall = mockPrisma.deal.update.mock.calls[0][0];
      expect(updateCall.data.actualCloseDate).toBeUndefined();
    });

    it('should throw NotFoundException for non-existent deal', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus('c1', 'bad', 'CLOSED_WON' as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      mockPrisma.deal.count
        .mockResolvedValueOnce(20) // totalDeals
        .mockResolvedValueOnce(12) // openDeals
        .mockResolvedValueOnce(5)  // wonDeals
        .mockResolvedValueOnce(3); // lostDeals
      mockPrisma.deal.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }) // totalPipelineValue
        .mockResolvedValueOnce({ _sum: { amount: 30000 } }); // totalWonValue

      const result = await service.getStatistics('c1');

      expect(result.totalDeals).toBe(20);
      expect(result.openDeals).toBe(12);
      expect(result.wonDeals).toBe(5);
      expect(result.lostDeals).toBe(3);
      expect(result.totalPipelineValue).toBe(50000);
      expect(result.totalWonValue).toBe(30000);
      // winRate = 5 / (5+3) * 100 = 62.5 → 63%
      expect(result.winRate).toBe(63);
    });

    it('should handle zero deals (no division by zero)', async () => {
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.deal.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getStatistics('c1');

      expect(result.totalDeals).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.totalPipelineValue).toBe(0);
      expect(result.totalWonValue).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return paginated results with currency included', async () => {
      const deals = [
        { id: 'd1', name: 'Deal 1', currency: { code: 'BGN' } },
        { id: 'd2', name: 'Deal 2', currency: { code: 'EUR' } },
      ];
      mockPrisma.deal.findMany.mockResolvedValue(deals);
      mockPrisma.deal.count.mockResolvedValue(2);

      const result = await service.findAll('c1', { page: 1, limit: 10 } as any);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ currency: true }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.findAll('c1', { status: 'NEGOTIATION' } as any);

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'c1',
            status: 'NEGOTIATION',
          }),
        }),
      );
    });

    it('should search by name or description', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.findAll('c1', { search: 'test' } as any);

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });
});
