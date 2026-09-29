import { NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContractsService.findOne', () => {
  const prisma = {
    contract: { findFirst: jest.fn() },
  };
  const service = new ContractsService(prisma as unknown as PrismaService);

  beforeEach(() => prisma.contract.findFirst.mockReset());

  it('returns the backend proxy address for each file instead of the raw storage key', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'ct1',
      companyId: 'co1',
      files: [
        {
          id: 'f1',
          fileName: 'a.pdf',
          fileUrl: 'contracts/co1/x.pdf',
          fileKey: 'contracts/co1/x.pdf',
        },
      ],
    });

    const contract = await service.findOne('co1', 'ct1');

    expect(contract.files[0].fileUrl).toBe(
      '/api/companies/co1/contracts/ct1/files/f1/file',
    );
    expect(contract.files[0].fileKey).toBe('contracts/co1/x.pdf');
  });

  it('throws when the contract belongs to another company', async () => {
    prisma.contract.findFirst.mockResolvedValue(null);
    await expect(service.findOne('co2', 'ct1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
