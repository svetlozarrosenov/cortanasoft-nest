import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { UploadsService } from '../uploads/uploads.service';
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
import { CreateIntegrationWebhookDto } from './dto/create-integration-webhook.dto';
import { UpdateIntegrationWebhookDto } from './dto/update-integration-webhook.dto';
import { SendWelcomeEmailDto, WelcomeEmailPartsDto } from './dto/welcome-email.dto';
import {
  mergeWelcomeEmailParts,
  renderWelcomeEmail,
  PASSWORD_MASK,
  WELCOME_EMAIL_DEFAULTS,
  WELCOME_EMAIL_PLACEHOLDERS,
} from './welcome-email';
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
    private uploadsService: UploadsService,
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

  // ==================== Company Logo Upload ====================

  @Post('companies/:id/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanyLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Не е предоставен файл');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Логото трябва да е изображение (PNG/JPEG/WebP)');
    }

    const existing = await this.prisma.company.findUnique({
      where: { id },
      select: { logoUrl: true },
    });
    if (!existing) throw new BadRequestException('Компанията не е намерена');

    const { key } = await this.uploadsService.uploadFile(id, 'logos', file);
    const logoUrl = `/api/public/files/${key}`;

    // Стария логото — ако е сочило към наш R2 ключ, го трием.
    if (existing.logoUrl) {
      const oldKey = this.extractR2Key(existing.logoUrl);
      if (oldKey && oldKey.startsWith('logos/')) {
        await this.uploadsService.deleteFile(oldKey);
      }
    }

    await this.prisma.company.update({
      where: { id },
      data: { logoUrl },
    });

    return { success: true, logoUrl };
  }

  @Delete('companies/:id/logo')
  async deleteCompanyLogo(@Param('id') id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { logoUrl: true },
    });
    if (!company) throw new BadRequestException('Компанията не е намерена');

    if (company.logoUrl) {
      const key = this.extractR2Key(company.logoUrl);
      if (key && key.startsWith('logos/')) {
        await this.uploadsService.deleteFile(key);
      }
    }

    await this.prisma.company.update({
      where: { id },
      data: { logoUrl: null },
    });

    return { success: true };
  }

  // Извлича R2 key-а от proxy URL `/api/public/files/<key>`. Връща null ако не е такъв URL.
  private extractR2Key(logoUrl: string): string | null {
    const match = logoUrl.match(/^\/api\/public\/files\/(.+)$/);
    return match ? match[1] : null;
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
      dto.partnerCustomerId,
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
    @Body('partnerCustomerId') partnerCustomerId?: string | null,
  ) {
    const userCompany = await this.adminService.updateUserCompanyRole(
      companyId,
      userId,
      roleId,
      partnerCustomerId,
    );
    return {
      success: true,
      userCompany,
    };
  }

  // Клиенти-партньори на компанията (за партньорски акаунти)
  @Get('companies/:companyId/partners')
  async getCompanyPartners(@Param('companyId') companyId: string) {
    const partners = await this.adminService.findPartnersByCompany(companyId);
    return {
      success: true,
      partners,
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

  // ==================== Integration Webhooks ====================

  @Get('companies/:companyId/integration-webhooks')
  async listIntegrationWebhooks(@Param('companyId') companyId: string) {
    const webhooks = await this.adminService.findIntegrationWebhooksByCompany(companyId);
    return { success: true, webhooks };
  }

  @Post('companies/:companyId/integration-webhooks')
  async createIntegrationWebhook(
    @Param('companyId') companyId: string,
    @Body() dto: CreateIntegrationWebhookDto,
  ) {
    const webhook = await this.adminService.createIntegrationWebhook(companyId, dto);
    return { success: true, webhook };
  }

  @Patch('companies/:companyId/integration-webhooks/:id')
  async updateIntegrationWebhook(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationWebhookDto,
  ) {
    const webhook = await this.adminService.updateIntegrationWebhook(companyId, id, dto);
    return { success: true, webhook };
  }

  @Delete('companies/:companyId/integration-webhooks/:id')
  async deleteIntegrationWebhook(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    await this.adminService.deleteIntegrationWebhook(companyId, id);
    return { success: true, message: 'Webhook deleted successfully' };
  }

  @Get('companies/:companyId/integration-webhooks/:id/deliveries')
  async getIntegrationWebhookDeliveries(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const deliveries = await this.adminService.getIntegrationWebhookDeliveries(companyId, id);
    return { success: true, deliveries };
  }

  // ==================== Welcome Email ====================

  // Стандартният текст, плейсхолдърите и преглед на имейла (паролата е
  // маскирана — реалната се слага само при изпращане, на сървъра).
  @Get('companies/:companyId/users/:userId/welcome-email')
  async getWelcomeEmailTemplate(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    const vars = await this.adminService.welcomeEmailVars(companyId, userId);
    const parts = mergeWelcomeEmailParts(null);
    const preview = renderWelcomeEmail(parts, { ...vars, password: PASSWORD_MASK });
    return {
      success: true,
      defaults: WELCOME_EMAIL_DEFAULTS,
      placeholders: WELCOME_EMAIL_PLACEHOLDERS,
      vars: { ...vars, password: undefined },
      previewHtml: preview.html,
      previewSubject: preview.subject,
    };
  }

  @Post('companies/:companyId/users/:userId/welcome-email/preview')
  async previewWelcomeEmail(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: WelcomeEmailPartsDto,
  ) {
    const vars = await this.adminService.welcomeEmailVars(companyId, userId);
    const preview = renderWelcomeEmail(mergeWelcomeEmailParts(dto), {
      ...vars,
      password: PASSWORD_MASK,
    });
    return { success: true, subject: preview.subject, html: preview.html };
  }

  @Post('companies/:companyId/users/:userId/send-welcome-email')
  async sendWelcomeEmail(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: SendWelcomeEmailDto,
  ) {
    const result = await this.adminService.prepareWelcomeEmail(
      companyId,
      userId,
      dto.password,
    );

    const { subject, html } = renderWelcomeEmail(mergeWelcomeEmailParts(dto), {
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      password: result.password,
      companyName: result.company.name,
      roleName: result.roleName,
    });

    await this.mailService.send({ to: result.user.email, subject, html });

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

}
