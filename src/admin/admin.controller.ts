import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignUserToCompanyDto } from './dto/assign-user-to-company.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyPlansService } from '../company-plans/company-plans.service';
import {
  CreateCompanyPlanDto,
  UpdateCompanyPlanDto,
} from '../company-plans/dto';
import { CompanyPlanStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private prisma: PrismaService,
    private companyPlansService: CompanyPlansService,
  ) {}

  // ==================== Companies ====================

  @Get('companies')
  async getAllCompanies() {
    const companies = await this.adminService.findAllCompanies();
    return {
      success: true,
      companies,
    };
  }

  @Get('companies/:id')
  async getCompanyById(@Param('id') id: string) {
    const company = await this.adminService.findCompanyById(id);
    return {
      success: true,
      company,
    };
  }

  @Post('companies')
  async createCompany(@Body() dto: CreateCompanyDto) {
    const company = await this.adminService.createCompany(dto);
    return {
      success: true,
      company,
    };
  }

  @Put('companies/:id')
  async updateCompany(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    const company = await this.adminService.updateCompany(id, dto);
    return {
      success: true,
      company,
    };
  }

  @Delete('companies/:id')
  async deleteCompany(@Param('id') id: string) {
    await this.adminService.deleteCompany(id);
    return {
      success: true,
      message: 'Company deleted successfully',
    };
  }

  // ==================== Users ====================

  @Get('users')
  async getAllUsers() {
    const users = await this.adminService.findAllUsers();
    return {
      success: true,
      users,
    };
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    const user = await this.adminService.findUserById(id);
    return {
      success: true,
      user,
    };
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.adminService.createUser(dto);
    return {
      success: true,
      user,
    };
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.adminService.updateUser(id, dto);
    return {
      success: true,
      user,
    };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  // ==================== Roles ====================

  @Get('companies/:companyId/roles')
  async getRolesByCompany(@Param('companyId') companyId: string) {
    const roles = await this.adminService.findRolesByCompany(companyId);
    return {
      success: true,
      roles,
    };
  }

  @Get('roles/:id')
  async getRoleById(@Param('id') id: string) {
    const role = await this.adminService.findRoleById(id);
    return {
      success: true,
      role,
    };
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    const role = await this.adminService.createRole(dto);
    return {
      success: true,
      role,
    };
  }

  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const role = await this.adminService.updateRole(id, dto);
    return {
      success: true,
      role,
    };
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    await this.adminService.deleteRole(id);
    return {
      success: true,
      message: 'Role deleted successfully',
    };
  }

  // ==================== Company Users ====================

  @Get('companies/:companyId/users')
  async getUsersByCompany(@Param('companyId') companyId: string) {
    const users = await this.adminService.findUsersByCompany(companyId);
    return {
      success: true,
      users,
    };
  }

  @Get('companies/:companyId/available-users')
  async getAvailableUsersForCompany(@Param('companyId') companyId: string) {
    const users = await this.adminService.findUsersNotInCompany(companyId);
    return {
      success: true,
      users,
    };
  }

  @Post('companies/:companyId/users')
  async assignUserToCompany(
    @Param('companyId') companyId: string,
    @Body() dto: AssignUserToCompanyDto,
  ) {
    const userCompany = await this.adminService.assignUserToCompany(
      companyId,
      dto.userId,
      dto.roleId,
      dto.isDefault,
    );
    return {
      success: true,
      userCompany,
    };
  }

  @Put('companies/:companyId/users/:userId')
  async updateUserCompanyRole(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body('roleId') roleId: string,
  ) {
    const userCompany = await this.adminService.updateUserCompanyRole(
      companyId,
      userId,
      roleId,
    );
    return {
      success: true,
      userCompany,
    };
  }

  @Delete('companies/:companyId/users/:userId')
  async removeUserFromCompany(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    await this.adminService.removeUserFromCompany(companyId, userId);
    return {
      success: true,
      message: 'User removed from company successfully',
    };
  }

  // ==================== Company Plans (Admin) ====================

  @Get('companies/:companyId/plans')
  async getCompanyPlans(@Param('companyId') companyId: string) {
    const plans = await this.prisma.companyPlan.findMany({
      where: { companyId },
      include: {
        currency: true,
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { items: true, generatedInvoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      plans,
    };
  }

  @Get('plans/:id')
  async getCompanyPlan(@Param('id') id: string) {
    // Get admin company (OWNER)
    const adminCompany = await this.prisma.company.findFirst({
      where: { role: 'OWNER' },
    });
    if (!adminCompany) {
      throw new Error('Admin company not found');
    }
    const plan = await this.companyPlansService.findOne(adminCompany.id, id);
    return {
      success: true,
      plan,
    };
  }

  @Post('plans')
  async createCompanyPlan(@Request() req: any, @Body() dto: CreateCompanyPlanDto) {
    // Get admin company (OWNER)
    const adminCompany = await this.prisma.company.findFirst({
      where: { role: 'OWNER' },
    });
    if (!adminCompany) {
      throw new Error('Admin company not found');
    }
    const plan = await this.companyPlansService.create(
      adminCompany.id,
      req.user.id,
      dto,
    );
    return {
      success: true,
      plan,
    };
  }

  @Put('plans/:id')
  async updateCompanyPlan(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyPlanDto,
  ) {
    // Get admin company (OWNER)
    const adminCompany = await this.prisma.company.findFirst({
      where: { role: 'OWNER' },
    });
    if (!adminCompany) {
      throw new Error('Admin company not found');
    }
    const plan = await this.companyPlansService.update(adminCompany.id, id, dto);
    return {
      success: true,
      plan,
    };
  }

  @Put('plans/:id/status')
  async updateCompanyPlanStatus(
    @Param('id') id: string,
    @Body('status') status: CompanyPlanStatus,
  ) {
    // Get admin company (OWNER)
    const adminCompany = await this.prisma.company.findFirst({
      where: { role: 'OWNER' },
    });
    if (!adminCompany) {
      throw new Error('Admin company not found');
    }
    const plan = await this.companyPlansService.updateStatus(
      adminCompany.id,
      id,
      status,
    );
    return {
      success: true,
      plan,
    };
  }

  @Post('plans/:id/generate-invoice')
  async generatePlanInvoice(@Param('id') id: string) {
    const invoice = await this.companyPlansService.generateInvoice(id);
    return {
      success: true,
      invoice,
    };
  }

  @Delete('plans/:id')
  async deleteCompanyPlan(@Param('id') id: string) {
    // Get admin company (OWNER)
    const adminCompany = await this.prisma.company.findFirst({
      where: { role: 'OWNER' },
    });
    if (!adminCompany) {
      throw new Error('Admin company not found');
    }
    const result = await this.companyPlansService.remove(adminCompany.id, id);
    return {
      success: true,
      ...result,
    };
  }
}
