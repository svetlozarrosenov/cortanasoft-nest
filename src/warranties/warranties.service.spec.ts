import { Test } from '@nestjs/testing';
import { WarrantiesService } from './warranties.service';
import { PrismaService } from '../prisma/prisma.service';

// Синхронизация на гаранциите с редовете при (повторно) „Доставена“:
// махнат ред → анулирана, нов ред → нова, запазен → остава с оригиналния срок.
const mockPrisma: any = {
  order: { findUnique: jest.fn() },
  issuedWarranty: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    createMany: jest.fn(),
  },
};

const template = { id: 'tpl', isActive: true, duration: 24, durationUnit: 'MONTHS' };
const item = (productId: string, quantity = 1, serial: string | null = null) => ({
  quantity,
  product: { id: productId, warrantyTemplate: template },
  inventorySerial: serial ? { serialNumber: serial } : null,
});

describe('WarrantiesService.createWarrantiesForOrder', () => {
  let service: WarrantiesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [WarrantiesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(WarrantiesService);
    mockPrisma.issuedWarranty.findFirst.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      customerId: 'cust',
      orderDate: new Date('2026-10-01'),
      deliveredAt: new Date('2026-10-05'),
      items: [item('A', 2), item('B')],
    });
  });

  it('първа доставка: издава по една гаранция на ред с шаблон', async () => {
    mockPrisma.issuedWarranty.findMany.mockResolvedValue([]);
    await service.createWarrantiesForOrder('c1', 'o1');
    expect(mockPrisma.issuedWarranty.createMany).toHaveBeenCalledTimes(1);
    const data = mockPrisma.issuedWarranty.createMany.mock.calls[0][0].data;
    expect(data.map((w: any) => [w.productId, w.quantity])).toEqual([['A', 2], ['B', 1]]);
    expect(data[0].startDate).toEqual(new Date('2026-10-05'));
    expect(mockPrisma.issuedWarranty.updateMany).not.toHaveBeenCalled();
  });

  it('повторна доставка след редакция: запазва A, анулира C, издава B, обновява количество', async () => {
    mockPrisma.issuedWarranty.findMany.mockResolvedValue([
      { id: 'wA', productId: 'A', serialNumber: null, quantity: 1 },
      { id: 'wC', productId: 'C', serialNumber: null, quantity: 1 },
    ]);
    await service.createWarrantiesForOrder('c1', 'o1');

    // A остава (само количеството 1 → 2)
    expect(mockPrisma.issuedWarranty.update).toHaveBeenCalledWith({
      where: { id: 'wA' },
      data: { quantity: 2 },
    });
    // C вече не е в продажбата
    expect(mockPrisma.issuedWarranty.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['wC'] } },
      data: { status: 'VOIDED' },
    });
    // B е нов ред
    const data = mockPrisma.issuedWarranty.createMany.mock.calls[0][0].data;
    expect(data.map((w: any) => w.productId)).toEqual(['B']);
  });

  it('без промяна: нищо не се издава и не се анулира', async () => {
    mockPrisma.issuedWarranty.findMany.mockResolvedValue([
      { id: 'wA', productId: 'A', serialNumber: null, quantity: 2 },
      { id: 'wB', productId: 'B', serialNumber: null, quantity: 1 },
    ]);
    await service.createWarrantiesForOrder('c1', 'o1');
    expect(mockPrisma.issuedWarranty.update).not.toHaveBeenCalled();
    expect(mockPrisma.issuedWarranty.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.issuedWarranty.createMany).not.toHaveBeenCalled();
  });

  it('серийни номера се сверяват по продукт + сериен', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      customerId: 'cust',
      orderDate: new Date('2026-10-01'),
      deliveredAt: new Date('2026-10-05'),
      items: [item('A', 1, 'SN-2')],
    });
    mockPrisma.issuedWarranty.findMany.mockResolvedValue([
      { id: 'w1', productId: 'A', serialNumber: 'SN-1', quantity: 1 },
    ]);
    await service.createWarrantiesForOrder('c1', 'o1');
    expect(mockPrisma.issuedWarranty.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['w1'] } },
      data: { status: 'VOIDED' },
    });
    expect(mockPrisma.issuedWarranty.createMany.mock.calls[0][0].data[0].serialNumber).toBe('SN-2');
  });
});
