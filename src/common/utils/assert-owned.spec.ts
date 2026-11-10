import { NotFoundException } from '@nestjs/common';
import {
  assertAllOwned,
  assertCompanyMember,
  assertOwned,
} from './assert-owned';

describe('assert-owned', () => {
  const db = () =>
    ({
      sprint: { findFirst: jest.fn() },
      product: { count: jest.fn() },
      inventoryBatch: { findFirst: jest.fn() },
      userCompany: { findUnique: jest.fn() },
    }) as any;

  it('skips empty ids without querying', async () => {
    const d = db();
    await assertOwned(d, 'sprint', undefined, 'c1');
    await assertOwned(d, 'sprint', null, 'c1');
    await assertOwned(d, 'sprint', '', 'c1');
    expect(d.sprint.findFirst).not.toHaveBeenCalled();
  });

  it('scopes the lookup by companyId and throws when missing', async () => {
    const d = db();
    d.sprint.findFirst.mockResolvedValue(null);
    await expect(assertOwned(d, 'sprint', 's-other', 'c1')).rejects.toThrow(
      NotFoundException,
    );
    expect(d.sprint.findFirst).toHaveBeenCalledWith({
      where: { id: 's-other', companyId: 'c1' },
      select: { id: true },
    });
    d.sprint.findFirst.mockResolvedValue({ id: 's1' });
    await expect(assertOwned(d, 'sprint', 's1', 'c1')).resolves.toBeUndefined();
  });

  it('extra filters cannot override id or companyId', async () => {
    const d = db();
    d.inventoryBatch.findFirst.mockResolvedValue({ id: 'b1' });
    await assertOwned(d, 'inventoryBatch', 'b1', 'c1', {
      productId: 'p1',
      companyId: 'c2',
    });
    expect(d.inventoryBatch.findFirst.mock.calls[0][0].where).toEqual({
      productId: 'p1',
      id: 'b1',
      companyId: 'c1',
    });
  });

  it('checks every distinct id in a list', async () => {
    const d = db();
    d.product.count.mockResolvedValue(1);
    await expect(
      assertAllOwned(d, 'product', ['p1', 'p2', 'p1', null], 'c1'),
    ).rejects.toThrow(NotFoundException);
    d.product.count.mockResolvedValue(2);
    await expect(
      assertAllOwned(d, 'product', ['p1', 'p2', 'p1', null], 'c1'),
    ).resolves.toBeUndefined();
    await assertAllOwned(d, 'product', [null, undefined], 'c1');
    expect(d.product.count).toHaveBeenCalledTimes(2);
  });

  it('rejects a user who is not a member of the company', async () => {
    const d = db();
    d.userCompany.findUnique.mockResolvedValue(null);
    await expect(assertCompanyMember(d, 'u9', 'c1')).rejects.toThrow(
      NotFoundException,
    );
    d.userCompany.findUnique.mockResolvedValue({ userId: 'u1' });
    await expect(assertCompanyMember(d, 'u1', 'c1')).resolves.toBeUndefined();
  });
});
