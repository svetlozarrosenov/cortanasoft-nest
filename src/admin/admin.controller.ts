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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyPlansService } from '../company-plans/company-plans.service';
import { MailService } from '../mail/mail.service';
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
    private mailService: MailService,
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

  // ==================== API Keys ====================

  @Get('companies/:companyId/api-keys')
  async getCompanyApiKeys(@Param('companyId') companyId: string) {
    const apiKeys = await this.adminService.findApiKeysByCompany(companyId);
    return {
      success: true,
      apiKeys,
    };
  }

  @Post('companies/:companyId/api-keys')
  async createCompanyApiKey(
    @Param('companyId') companyId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    const { apiKey, rawKey } = await this.adminService.createApiKey(
      companyId,
      dto,
    );
    return {
      success: true,
      apiKey,
      rawKey,
    };
  }

  @Delete('companies/:companyId/api-keys/:id')
  async deleteCompanyApiKey(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    await this.adminService.deleteApiKey(companyId, id);
    return {
      success: true,
      message: 'API key deleted successfully',
    };
  }

  // ==================== Welcome Email ====================

  @Post('companies/:companyId/users/:userId/send-welcome-email')
  async sendWelcomeEmail(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body('password') password?: string,
  ) {
    const result = await this.adminService.prepareWelcomeEmail(
      companyId,
      userId,
      password,
    );

    await this.mailService.send({
      to: result.user.email,
      subject: `Добре дошли в ${result.company.name} — CortanaSoft`,
      html: this.buildWelcomeEmail(
        result.user.firstName,
        result.user.email,
        result.company.name,
        result.password,
        result.roleName,
      ),
    });

    return {
      success: true,
      message: 'Welcome email sent',
      ...(result.wasGenerated && { generatedPassword: result.password }),
    };
  }

  // ==================== WooCommerce Import ====================

  @Post('companies/:companyId/import-woocommerce')
  @UseInterceptors(FileInterceptor('file'))
  async importWooCommerceProducts(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('CSV файлът е задължителен');
    }
    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Файлът трябва да бъде CSV формат');
    }

    const result = await this.adminService.importWooCommerceProducts(
      companyId,
      file.buffer,
      req.user.id,
    );

    return {
      success: true,
      ...result,
    };
  }

  private buildWelcomeEmail(
    firstName: string,
    email: string,
    companyName: string,
    password: string,
    roleName: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Добре дошли в CortanaSoft</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">ERP &bull; CRM &bull; HR &bull; Управление на проекти</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px;color:#18181b;font-size:22px;font-weight:600;">Здравейте, ${firstName}!</h2>

              <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.7;">
                Вашият акаунт в <strong>cortanasoft.com</strong> е готов за използване. По-долу ще намерите данните за вход в платформата.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f8f7ff;border:1px solid #e0e0ff;border-radius:10px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 4px;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Данни за вход</p>
                    <table cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">URL:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:14px;"><a href="https://cortanasoft.com/login" style="color:#4f46e5;text-decoration:none;font-weight:500;">https://cortanasoft.com/login</a></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">Email:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:14px;">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">Парола:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:15px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;">${password}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">Роля:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:14px;">${roleName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background-color:#fef9c3;border:1px solid #fde68a;border-radius:8px;">
                <tr>
                  <td style="padding:14px 20px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                      &#128274; <strong>Препоръчваме Ви да смените паролата си при първо влизане.</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;">
                    <a href="https://cortanasoft.com/login" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Вход в платформата &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 4px;color:#71717a;font-size:13px;text-align:center;">
                CortanaSoft &mdash; Вашият бизнес, една платформа.
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} CortanaSoft. Всички права запазени.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
