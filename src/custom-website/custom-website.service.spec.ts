import { Test } from '@nestjs/testing';
import { CustomWebsiteService } from './custom-website.service';
import { PrismaService } from '../prisma/prisma.service';

// Поръчка от уебсайта → редовете на продажбата получават описание (snapshot
// на името на продукта), както при ръчно създадена продажба.
const mockPrisma = {
  order: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  customer: { findFirst: jest.fn(), create: jest.fn() },
  product: { findMany: jest.fn() },
  settlement: { findFirst: jest.fn() },
};

describe('CustomWebsiteService.upsertImportedOrder', () => {
  let service: CustomWebsiteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CustomWebsiteService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CustomWebsiteService);
  });

  it('записва името на продукта като описание на всеки ред', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: 'cust1',
      isPartner: false,
      referredById: null,
    });
    mockPrisma.order.findFirst.mockResolvedValue(null); // нова поръчка
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'p1', sku: 'SKU-1', name: 'Кабел 3×2.5', vatRate: 20 },
      { id: 'p2', sku: 'SKU-2', name: 'Монтаж', vatRate: 20 },
    ]);
    mockPrisma.order.create.mockResolvedValue({ id: 'o1' });

    const result = await (service as any).upsertImportedOrder('c1', {
      orderNumber: 'WEB-1',
      status: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      customer: {
        email: 'a@b.bg',
        phone: '',
        firstName: 'Иван',
        lastName: 'Петров',
      },
      shipping: {
        address: 'ул. X',
        city: 'София',
        postalCode: '1000',
        country: 'BG',
        method: null,
      },
      totals: { subtotal: 120, shippingCost: 0, discount: 0, total: 120 },
      items: [
        {
          sku: 'SKU-1',
          name: 'кабел (от сайта)',
          quantity: 2,
          unitPrice: 12,
          lineTotal: 24,
        },
        {
          sku: 'SKU-2',
          name: 'монтаж (от сайта)',
          quantity: 1,
          unitPrice: 96,
          lineTotal: 96,
        },
        {
          sku: 'NOPE',
          name: 'непознат',
          quantity: 1,
          unitPrice: 1,
          lineTotal: 1,
        },
      ],
      notes: null,
      createdAt: new Date().toISOString(),
    });

    expect(result).toBe('created');
    const rows = mockPrisma.order.create.mock.calls[0][0].data.items.create;
    // непознатото SKU се пропуска; описанието е името от номенклатурата, не от сайта
    expect(rows.map((r: any) => [r.productId, r.description])).toEqual([
      ['p1', 'Кабел 3×2.5'],
      ['p2', 'Монтаж'],
    ]);
  });
});
