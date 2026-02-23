import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  department: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  departmentMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  userCompany: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DepartmentsService>(DepartmentsService);
  });

  describe('create', () => {
    const baseDto = { name: 'Engineering' };

    it('should create a department successfully', async () => {
      mockPrisma.department.create.mockResolvedValue({ id: 'd1', name: 'Engineering' });

      const result = await service.create('c1', baseDto as any);
      expect(result.name).toBe('Engineering');
    });

    it('should throw ConflictException for duplicate code', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('c1', { ...baseDto, code: 'ENG' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent parent', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.create('c1', { ...baseDto, parentId: 'bad-parent' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when manager is not company employee', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue(null);

      await expect(
        service.create('c1', { ...baseDto, managerId: 'bad-user' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create with valid parent and manager', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'parent1' }); // parent exists
      mockPrisma.userCompany.findFirst.mockResolvedValue({ userId: 'mgr1' }); // manager is employee
      mockPrisma.department.create.mockResolvedValue({
        id: 'd1',
        name: 'Frontend',
        parentId: 'parent1',
        managerId: 'mgr1',
      });

      const result = await service.create('c1', {
        ...baseDto,
        name: 'Frontend',
        parentId: 'parent1',
        managerId: 'mgr1',
      } as any);

      expect(result.parentId).toBe('parent1');
      expect(result.managerId).toBe('mgr1');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when department not found', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);

      await expect(service.findOne('c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should return department with enriched member data', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({
        id: 'd1',
        managerId: 'mgr1',
        members: [{ userId: 'u1' }],
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', firstName: 'John' }) // member user
        .mockResolvedValueOnce({ id: 'mgr1', firstName: 'Boss' }); // manager

      const result = await service.findOne('c1', 'd1');
      expect(result.members[0].user.firstName).toBe('John');
      expect(result.manager.firstName).toBe('Boss');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when department not found', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);

      await expect(service.update('c1', 'bad', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate code on update', async () => {
      mockPrisma.department.findFirst
        .mockResolvedValueOnce({ id: 'd1', code: 'OLD' }) // findOne
        .mockResolvedValueOnce({ id: 'd2', code: 'TAKEN' }); // code check

      await expect(
        service.update('c1', 'd1', { code: 'TAKEN' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for self-parent', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'd1', parentId: null });

      await expect(
        service.update('c1', 'd1', { parentId: 'd1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent parent on update', async () => {
      mockPrisma.department.findFirst
        .mockResolvedValueOnce({ id: 'd1', parentId: null }) // findOne
        .mockResolvedValueOnce(null); // parent check

      await expect(
        service.update('c1', 'd1', { parentId: 'bad-parent' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new manager is not employee', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'd1', managerId: null });
      mockPrisma.userCompany.findFirst.mockResolvedValue(null);

      await expect(
        service.update('c1', 'd1', { managerId: 'bad-user' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update department successfully', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'd1', code: 'ENG', parentId: null, managerId: null });
      mockPrisma.department.update.mockResolvedValue({ id: 'd1', name: 'Updated Name' });

      const result = await service.update('c1', 'd1', { name: 'Updated Name' } as any);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when department not found', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);

      await expect(service.remove('c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when department has children', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({
        id: 'd1',
        _count: { members: 0, children: 2 },
      });

      await expect(service.remove('c1', 'd1')).rejects.toThrow(BadRequestException);
    });

    it('should allow deletion with members but no children', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({
        id: 'd1',
        _count: { members: 5, children: 0 },
      });
      mockPrisma.department.delete.mockResolvedValue({ id: 'd1' });

      const result = await service.remove('c1', 'd1');
      expect(result.success).toBe(true);
    });

    it('should delete department with no children', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({
        id: 'd1',
        _count: { members: 0, children: 0 },
      });
      mockPrisma.department.delete.mockResolvedValue({ id: 'd1' });

      const result = await service.remove('c1', 'd1');
      expect(result.success).toBe(true);
      expect(mockPrisma.department.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });
  });

  describe('addMember', () => {
    it('should throw NotFoundException when department not found', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember('c1', 'bad', { userId: 'u1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not an employee', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'd1' });
      mockPrisma.userCompany.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember('c1', 'd1', { userId: 'bad-user' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate member', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'd1' });
      mockPrisma.userCompany.findFirst.mockResolvedValue({ userId: 'u1' });
      mockPrisma.departmentMember.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addMember('c1', 'd1', { userId: 'u1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should add member successfully', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'd1' });
      mockPrisma.userCompany.findFirst.mockResolvedValue({ userId: 'u1' });
      mockPrisma.departmentMember.findUnique.mockResolvedValue(null);
      mockPrisma.departmentMember.create.mockResolvedValue({ id: 'm1', userId: 'u1', isHead: false });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'John' });

      const result = await service.addMember('c1', 'd1', { userId: 'u1', position: 'Developer' } as any);
      expect(result.user.firstName).toBe('John');
    });

    it('should remove others head status when adding as head', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'd1' });
      mockPrisma.userCompany.findFirst.mockResolvedValue({ userId: 'u2' });
      mockPrisma.departmentMember.findUnique.mockResolvedValue(null);
      mockPrisma.departmentMember.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.departmentMember.create.mockResolvedValue({ id: 'm2', userId: 'u2', isHead: true });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2' });

      await service.addMember('c1', 'd1', { userId: 'u2', isHead: true } as any);

      expect(mockPrisma.departmentMember.updateMany).toHaveBeenCalledWith({
        where: { departmentId: 'd1', isHead: true },
        data: { isHead: false },
      });
    });
  });

  describe('updateMember', () => {
    it('should throw NotFoundException when member not found', async () => {
      mockPrisma.departmentMember.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMember('c1', 'd1', 'u1', { position: 'Senior' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update member position', async () => {
      mockPrisma.departmentMember.findFirst.mockResolvedValue({ id: 'm1', userId: 'u1' });
      mockPrisma.departmentMember.update.mockResolvedValue({ id: 'm1', position: 'Senior' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      const result = await service.updateMember('c1', 'd1', 'u1', { position: 'Senior' } as any);
      expect(result.position).toBe('Senior');
    });

    it('should remove others head status when promoting to head', async () => {
      mockPrisma.departmentMember.findFirst.mockResolvedValue({ id: 'm1', userId: 'u1' });
      mockPrisma.departmentMember.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.departmentMember.update.mockResolvedValue({ id: 'm1', isHead: true });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await service.updateMember('c1', 'd1', 'u1', { isHead: true } as any);

      expect(mockPrisma.departmentMember.updateMany).toHaveBeenCalledWith({
        where: { departmentId: 'd1', isHead: true, NOT: { userId: 'u1' } },
        data: { isHead: false },
      });
    });
  });

  describe('removeMember', () => {
    it('should throw NotFoundException when member not found', async () => {
      mockPrisma.departmentMember.findFirst.mockResolvedValue(null);

      await expect(service.removeMember('c1', 'd1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should remove member successfully', async () => {
      mockPrisma.departmentMember.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.departmentMember.delete.mockResolvedValue({ id: 'm1' });

      const result = await service.removeMember('c1', 'd1', 'u1');
      expect(result.success).toBe(true);
    });
  });

  describe('getAvailableEmployees', () => {
    it('should return employees not in the department', async () => {
      mockPrisma.departmentMember.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
      ]);
      mockPrisma.userCompany.findMany.mockResolvedValue([
        {
          user: { id: 'u3', firstName: 'New', lastName: 'Guy', email: 'n@g.com', isActive: true },
          role: { id: 'r1', name: 'Developer' },
        },
      ]);

      const result = await service.getAvailableEmployees('c1', 'd1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('u3');
      // Verify notIn filter was used
      expect(mockPrisma.userCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { notIn: ['u1', 'u2'] },
          }),
        }),
      );
    });

    it('should return all employees when no existing members', async () => {
      mockPrisma.departmentMember.findMany.mockResolvedValue([]);
      mockPrisma.userCompany.findMany.mockResolvedValue([
        { user: { id: 'u1' }, role: { id: 'r1', name: 'Admin' } },
        { user: { id: 'u2' }, role: { id: 'r2', name: 'Dev' } },
      ]);

      const result = await service.getAvailableEmployees('c1', 'd1');
      expect(result).toHaveLength(2);
    });
  });
});
