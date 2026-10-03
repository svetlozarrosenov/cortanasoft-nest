import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerCategoriesService } from './customer-categories.service';

describe('CustomerCategoriesService', () => {
  const prisma: any = {
    customerCategory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };
  const service = new CustomerCategoriesService(prisma);
  beforeEach(() => jest.clearAllMocks());

  it('създава категория с companyId на фирмата', async () => {
    prisma.customerCategory.findFirst.mockResolvedValue(null);
    prisma.customerCategory.create.mockResolvedValue({ id: 'k1' });
    await service.create('c1', { name: '  Птицевъдство ' });
    expect(prisma.customerCategory.create.mock.calls[0][0].data).toEqual({
      name: 'Птицевъдство',
      description: null,
      companyId: 'c1',
    });
  });

  it('не допуска дублирано име в същата фирма (без значение на регистъра)', async () => {
    prisma.customerCategory.findFirst.mockResolvedValue({ id: 'k0' });
    await expect(
      service.create('c1', { name: 'птицевъдство' }),
    ).rejects.toThrow(ConflictException);
    expect(
      prisma.customerCategory.findFirst.mock.calls[0][0].where,
    ).toMatchObject({
      companyId: 'c1',
      name: { equals: 'птицевъдство', mode: 'insensitive' },
    });
  });

  it('не трие категория с клиенти', async () => {
    prisma.customerCategory.findFirst.mockResolvedValue({
      id: 'k1',
      _count: { customers: 3 },
    });
    await expect(service.remove('c1', 'k1')).rejects.toThrow(ConflictException);
    expect(prisma.customerCategory.delete).not.toHaveBeenCalled();
  });

  it('отхвърля категория на друга фирма при закачане към клиент', async () => {
    prisma.customerCategory.count.mockResolvedValue(1);
    await expect(
      service.assertAllBelongToCompany('c1', ['k1', 'foreign']),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.customerCategory.count.mock.calls[0][0].where).toEqual({
      id: { in: ['k1', 'foreign'] },
      companyId: 'c1',
    });
  });
});
