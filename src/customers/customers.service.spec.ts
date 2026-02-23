import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  customer: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  country: {
    findUnique: jest.fn(),
  },
};

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CustomersService>(CustomersService);
  });

  describe('create', () => {
    it('should create a COMPANY customer with companyName', async () => {
      const dto = { type: 'COMPANY' as any, companyName: 'ACME Ltd' };
      const expected = { id: '1', companyId: 'c1', ...dto };
      mockPrisma.customer.create.mockResolvedValue(expected);

      const result = await service.create('c1', dto as any);
      expect(result).toEqual(expected);
      expect(mockPrisma.customer.create).toHaveBeenCalled();
    });

    it('should create an INDIVIDUAL customer with firstName and lastName', async () => {
      const dto = { type: 'INDIVIDUAL' as any, firstName: 'John', lastName: 'Doe' };
      const expected = { id: '1', companyId: 'c1', ...dto };
      mockPrisma.customer.create.mockResolvedValue(expected);

      const result = await service.create('c1', dto as any);
      expect(result).toEqual(expected);
    });

    it('should default type to INDIVIDUAL when not specified', async () => {
      const dto = { firstName: 'Jane' };
      mockPrisma.customer.create.mockResolvedValue({ id: '1', type: 'INDIVIDUAL', ...dto });

      await service.create('c1', dto as any);
      expect(mockPrisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'INDIVIDUAL' }),
        }),
      );
    });

    it('should throw BadRequestException when COMPANY type missing companyName', async () => {
      const dto = { type: 'COMPANY' as any };
      await expect(service.create('c1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when INDIVIDUAL missing firstName and lastName', async () => {
      const dto = { type: 'INDIVIDUAL' as any };
      await expect(service.create('c1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when duplicate EIK in same company', async () => {
      const dto = { firstName: 'John', eik: '123456789' };
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create('c1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should allow same EIK in different company', async () => {
      const dto = { firstName: 'John', eik: '123456789' };
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: '1', ...dto });

      await service.create('c1', dto as any);
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'c1', eik: '123456789' } }),
      );
    });

    it('should throw NotFoundException when countryId not found', async () => {
      const dto = { firstName: 'John', countryId: 'bad-id' };
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.country.findUnique.mockResolvedValue(null);

      await expect(service.create('c1', dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.findOne('c1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should return customer when found', async () => {
      const customer = { id: '1', companyId: 'c1', firstName: 'John' };
      mockPrisma.customer.findFirst.mockResolvedValue(customer);

      const result = await service.findOne('c1', '1');
      expect(result).toEqual(customer);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException when deleting customer with orders', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: '1',
        _count: { orders: 3 },
      });

      await expect(service.remove('c1', '1')).rejects.toThrow(BadRequestException);
    });

    it('should delete customer with no orders', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: '1',
        _count: { orders: 0 },
      });
      mockPrisma.customer.delete.mockResolvedValue({});

      const result = await service.remove('c1', '1');
      expect(result.message).toBe('Customer deleted successfully');
      expect(mockPrisma.customer.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('getDisplayName', () => {
    it('should return companyName for COMPANY type', () => {
      expect(service.getDisplayName({ type: 'COMPANY' as any, companyName: 'ACME' }))
        .toBe('ACME');
    });

    it('should return "Unnamed Company" when companyName is null', () => {
      expect(service.getDisplayName({ type: 'COMPANY' as any, companyName: null }))
        .toBe('Unnamed Company');
    });

    it('should return "firstName lastName" for INDIVIDUAL type', () => {
      expect(service.getDisplayName({ type: 'INDIVIDUAL' as any, firstName: 'John', lastName: 'Doe' }))
        .toBe('John Doe');
    });

    it('should return "Unnamed Customer" when INDIVIDUAL has no name', () => {
      expect(service.getDisplayName({ type: 'INDIVIDUAL' as any, firstName: null, lastName: null }))
        .toBe('Unnamed Customer');
    });
  });
});
