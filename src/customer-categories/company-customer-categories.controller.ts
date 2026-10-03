import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerCategoriesService } from './customer-categories.service';
import {
  CreateCustomerCategoryDto,
  QueryCustomerCategoriesDto,
  UpdateCustomerCategoryDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireEdit,
  RequireView,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/customer-categories')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyCustomerCategoriesController {
  constructor(private categories: CustomerCategoriesService) {}

  @Get()
  @RequireView('crm', 'customerCategories')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryCustomerCategoriesDto,
  ) {
    return this.categories.findAll(companyId, query);
  }

  @Post()
  @RequireCreate('crm', 'customerCategories')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCustomerCategoryDto,
  ) {
    return this.categories.create(companyId, dto);
  }

  @Patch(':id')
  @RequireEdit('crm', 'customerCategories')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerCategoryDto,
  ) {
    return this.categories.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('crm', 'customerCategories')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.categories.remove(companyId, id);
  }
}
