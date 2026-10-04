import { NotFoundException } from '@nestjs/common';
import { CustomerContactsService } from './customer-contacts.service';

describe('CustomerContactsService', () => {
  const tx = {
    customerContact: {
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma: any = {
    customer: { findFirst: jest.fn() },
    customerContact: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new CustomerContactsService(prisma);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.customer.findFirst.mockResolvedValue({ id: 'cu1' });
  });

  it('проверява, че клиентът е на фирмата (и в партньорския обхват)', async () => {
    prisma.customerContact.findMany.mockResolvedValue([]);
    await service.findAll('c1', 'cu1', 'p1');
    expect(prisma.customer.findFirst.mock.calls[0][0].where).toEqual({
      id: 'cu1',
      companyId: 'c1',
      OR: [{ id: 'p1' }, { referredById: 'p1' }],
    });
    expect(prisma.customerContact.findMany.mock.calls[0][0].where).toEqual({
      companyId: 'c1',
      customerId: 'cu1',
    });
  });

  it('отказва чужд клиент', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(service.findAll('c1', 'cu-other')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('създава контакт с companyId и customerId, trim-ва и празното става null', async () => {
    tx.customerContact.create.mockResolvedValue({ id: 'k1' });
    await service.create('c1', 'cu1', {
      name: ' Иван Петров ',
      position: 'Управител база Шумен',
      email: '   ',
      phone: '0888',
    });
    expect(tx.customerContact.create.mock.calls[0][0].data).toEqual({
      name: 'Иван Петров',
      position: 'Управител база Шумен',
      email: null,
      phone: '0888',
      companyId: 'c1',
      customerId: 'cu1',
    });
    expect(tx.customerContact.updateMany).not.toHaveBeenCalled();
  });

  it('основното лице е само едно на клиент', async () => {
    tx.customerContact.create.mockResolvedValue({ id: 'k2' });
    await service.create('c1', 'cu1', { name: 'Мария', isPrimary: true });
    expect(tx.customerContact.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'c1', customerId: 'cu1', isPrimary: true },
      data: { isPrimary: false },
    });
  });

  it('редакцията намира контакта само в рамките на фирмата и клиента', async () => {
    prisma.customerContact.findFirst.mockResolvedValue(null);
    await expect(
      service.update('c1', 'cu1', 'k9', { name: 'X' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.customerContact.findFirst.mock.calls[0][0].where).toEqual({
      id: 'k9',
      companyId: 'c1',
      customerId: 'cu1',
    });
  });

  it('изтриването е скопирано по фирма и клиент', async () => {
    prisma.customerContact.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('c1', 'cu1', 'k9')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.customerContact.deleteMany).toHaveBeenCalledWith({
      where: { id: 'k9', companyId: 'c1', customerId: 'cu1' },
    });
  });
});
