import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  AddMemberDto,
  UpdateMemberDto,
} from './dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  // ==================== Departments ====================

  async create(companyId: string, dto: CreateDepartmentDto) {
    // Check if code is unique within company (if provided)
    if (dto.code) {
      const existing = await this.prisma.department.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: dto.code,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          'Department code already exists in this company',
        );
      }
    }

    // Verify parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, companyId },
      });

      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }
    }

    // Verify manager is employee of company if provided
    if (dto.managerId) {
      const userCompany = await this.prisma.userCompany.findFirst({
        where: { userId: dto.managerId, companyId },
      });

      if (!userCompany) {
        throw new BadRequestException(
          'Manager is not an employee of this company',
        );
      }
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name,
        description: dto.description,
        code: dto.code,
        parentId: dto.parentId,
        managerId: dto.managerId,
        isActive: dto.isActive ?? true,
        companyId,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return department;
  }

  async findAll(companyId: string) {
    const departments = await this.prisma.department.findMany({
      where: { companyId },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, isActive: true },
        },
        members: {
          include: {
            department: false,
          },
        },
        _count: {
          select: { members: true, children: true },
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    // Enrich with user data
    const enrichedDepartments = await Promise.all(
      departments.map(async (dept) => {
        const membersWithUsers = await Promise.all(
          dept.members.map(async (member) => {
            const user = await this.prisma.user.findUnique({
              where: { id: member.userId },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            });
            return { ...member, user };
          }),
        );

        // Get manager info if exists
        let manager: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
        } | null = null;
        if (dept.managerId) {
          manager = await this.prisma.user.findUnique({
            where: { id: dept.managerId },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          });
        }

        return {
          ...dept,
          members: membersWithUsers,
          manager,
        };
      }),
    );

    return {
      data: enrichedDepartments,
      meta: {
        total: departments.length,
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, companyId },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, isActive: true },
        },
        members: true,
        _count: {
          select: { members: true, children: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Enrich with user data
    const membersWithUsers = await Promise.all(
      department.members.map(async (member) => {
        const user = await this.prisma.user.findUnique({
          where: { id: member.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        });
        return { ...member, user };
      }),
    );

    // Get manager info
    let manager: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null = null;
    if (department.managerId) {
      manager = await this.prisma.user.findUnique({
        where: { id: department.managerId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    }

    return {
      ...department,
      members: membersWithUsers,
      manager,
    };
  }

  async update(companyId: string, id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findFirst({
      where: { id, companyId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== department.code) {
      const existing = await this.prisma.department.findFirst({
        where: {
          companyId,
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Department code already exists');
      }
    }

    // Verify parent if changing
    if (dto.parentId && dto.parentId !== department.parentId) {
      // Cannot be own parent
      if (dto.parentId === id) {
        throw new BadRequestException('Department cannot be its own parent');
      }

      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, companyId },
      });

      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }
    }

    // Verify manager if changing
    if (dto.managerId && dto.managerId !== department.managerId) {
      const userCompany = await this.prisma.userCompany.findFirst({
        where: { userId: dto.managerId, companyId },
      });

      if (!userCompany) {
        throw new BadRequestException(
          'Manager is not an employee of this company',
        );
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        code: dto.code,
        parentId: dto.parentId,
        managerId: dto.managerId,
        isActive: dto.isActive,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return updated;
  }

  async remove(companyId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { members: true, children: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Don't allow deletion if has children
    if (department._count.children > 0) {
      throw new BadRequestException(
        'Cannot delete department with sub-departments. Delete or reassign them first.',
      );
    }

    await this.prisma.department.delete({
      where: { id },
    });

    return { success: true, message: 'Department deleted' };
  }

  // ==================== Department Members ====================

  async addMember(companyId: string, departmentId: string, dto: AddMemberDto) {
    // Verify department exists
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, companyId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Verify user is employee of company
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId: dto.userId, companyId },
    });

    if (!userCompany) {
      throw new BadRequestException('User is not an employee of this company');
    }

    // Check if already a member
    const existingMember = await this.prisma.departmentMember.findUnique({
      where: {
        departmentId_userId: {
          departmentId,
          userId: dto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this department',
      );
    }

    // If setting as head, remove head status from others
    if (dto.isHead) {
      await this.prisma.departmentMember.updateMany({
        where: { departmentId, isHead: true },
        data: { isHead: false },
      });
    }

    const member = await this.prisma.departmentMember.create({
      data: {
        departmentId,
        userId: dto.userId,
        companyId,
        position: dto.position,
        isHead: dto.isHead ?? false,
      },
    });

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    return { ...member, user };
  }

  async updateMember(
    companyId: string,
    departmentId: string,
    userId: string,
    dto: UpdateMemberDto,
  ) {
    const member = await this.prisma.departmentMember.findFirst({
      where: { departmentId, userId, companyId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this department');
    }

    // If setting as head, remove head status from others
    if (dto.isHead) {
      await this.prisma.departmentMember.updateMany({
        where: { departmentId, isHead: true, NOT: { userId } },
        data: { isHead: false },
      });
    }

    const updated = await this.prisma.departmentMember.update({
      where: { id: member.id },
      data: {
        position: dto.position,
        isHead: dto.isHead,
      },
    });

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    return { ...updated, user };
  }

  async removeMember(companyId: string, departmentId: string, userId: string) {
    const member = await this.prisma.departmentMember.findFirst({
      where: { departmentId, userId, companyId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this department');
    }

    await this.prisma.departmentMember.delete({
      where: { id: member.id },
    });

    return { success: true, message: 'Member removed from department' };
  }

  async getAvailableEmployees(companyId: string, departmentId: string) {
    // Get all employees not in this department
    const existingMembers = await this.prisma.departmentMember.findMany({
      where: { departmentId },
      select: { userId: true },
    });

    const existingUserIds = existingMembers.map((m) => m.userId);

    const userCompanies = await this.prisma.userCompany.findMany({
      where: {
        companyId,
        userId: { notIn: existingUserIds },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return userCompanies.map((uc) => ({
      ...uc.user,
      role: uc.role,
    }));
  }
}
