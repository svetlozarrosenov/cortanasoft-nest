import { ShippingService } from './shipping.service';

function build(order: Record<string, unknown>) {
  const prisma = {
    order: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'o1',
        orderNumber: 'ORD-1',
        deliveryMethod: null,
        items: [],
        ...order,
      }),
      update: jest.fn(),
    },
    shipment: { findFirst: jest.fn().mockResolvedValue(null) },
    invoice: { findFirst: jest.fn().mockResolvedValue(null) },
  } as any;
  const provider = {
    name: 'pigeon',
    createShipment: jest.fn().mockResolvedValue({ id: 'sh1' }),
  };
  const registry = { get: jest.fn().mockReturnValue(provider) } as any;
  const webhooks = { emitOrderChanged: jest.fn() } as any;
  const service = new ShippingService(prisma, registry, {} as any, webhooks);
  const create = (dto: Record<string, unknown>) =>
    service.createShipment('c1', {
      orderId: 'o1',
      provider: 'pigeon',
      ...dto,
    } as any);
  const updated = () => prisma.order.update.mock.calls[0]?.[0]?.data;
  return { create, updated };
}

describe('ShippingService.createShipment: the sale after the label', () => {
  it('cash on delivery on the label makes an unpaid sale COD', async () => {
    const { create, updated } = build({
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'PENDING',
    });
    await create({ codEnabled: true, codAmount: 50 });
    expect(updated()).toEqual({
      deliveryMethod: 'pigeon',
      paymentMethod: 'COD',
    });
  });

  it('a label without it puts an unpaid COD sale back to bank transfer', async () => {
    const { create, updated } = build({
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
    });
    await create({ codAmount: 0 });
    expect(updated()).toEqual({
      deliveryMethod: 'pigeon',
      paymentMethod: 'BANK_TRANSFER',
    });
  });

  it('a paid sale keeps its payment method whatever the label says', async () => {
    const paidCash = build({ paymentMethod: 'CASH', paymentStatus: 'PAID' });
    await paidCash.create({ codEnabled: true, codAmount: 50 });
    expect(paidCash.updated()).toEqual({ deliveryMethod: 'pigeon' });

    const paidCod = build({ paymentMethod: 'COD', paymentStatus: 'PAID' });
    await paidCod.create({ codAmount: 0 });
    expect(paidCod.updated()).toEqual({ deliveryMethod: 'pigeon' });
  });

  it('an amount with cash on delivery switched off is not on the label', async () => {
    const { create, updated } = build({
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
    });
    await create({ codEnabled: false, codAmount: 50 });
    expect(updated()).toEqual({ deliveryMethod: 'pigeon' });
  });
});
