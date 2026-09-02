import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  position: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PositionsService', () => {
  let service: PositionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [PositionsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(PositionsService);
  });

  it('findAll: hides inactive by default and is company-scoped', async () => {
    mockPrisma.position.findMany.mockResolvedValue([]);
    await service.findAll('c1');
    expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'c1', isActive: true } }),
    );
    await service.findAll('c1', true);
    expect(mockPrisma.position.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { companyId: 'c1' } }),
    );
  });

  it('create: trims fields and stores hourly rate', async () => {
    mockPrisma.position.findFirst.mockResolvedValue(null);
    mockPrisma.position.create.mockImplementation(({ data }) => ({ id: 'p1', ...data }));
    const res = await service.create('c1', { name: '  Монтажник ', code: ' M1 ', hourlyRate: 12.5 });
    expect(res).toMatchObject({ name: 'Монтажник', code: 'M1', hourlyRate: 12.5, isActive: true, companyId: 'c1' });
  });

  it('create: rejects duplicate name (case-insensitive) within the company', async () => {
    mockPrisma.position.findFirst.mockResolvedValue({ id: 'other' });
    await expect(service.create('c1', { name: 'монтажник' })).rejects.toThrow(ConflictException);
    expect(mockPrisma.position.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'c1', name: { equals: 'монтажник', mode: 'insensitive' } }),
      }),
    );
  });

  it('findOne: 404 for a position from another company', async () => {
    mockPrisma.position.findFirst.mockResolvedValue(null);
    await expect(service.findOne('c1', 'p-foreign')).rejects.toThrow(NotFoundException);
  });

  it('remove: refuses when the position has members', async () => {
    mockPrisma.position.findFirst.mockResolvedValue({ id: 'p1', _count: { members: 2 } });
    await expect(service.remove('c1', 'p1')).rejects.toThrow(BadRequestException);
    expect(mockPrisma.position.delete).not.toHaveBeenCalled();
  });

  it('remove: deletes an unused position', async () => {
    mockPrisma.position.findFirst.mockResolvedValue({ id: 'p1', _count: { members: 0 } });
    mockPrisma.position.delete.mockResolvedValue({});
    await expect(service.remove('c1', 'p1')).resolves.toEqual({ success: true });
  });
});
