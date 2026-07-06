import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySuppliersDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtCompanyGuard } from '../common/guards/jwt-company.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, JwtCompanyGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequireCreate('warehouse', 'suppliers')
  create(@CurrentUser() user: any, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user.currentCompany.id, dto);
  }

  @Get()
  @RequireView('warehouse', 'suppliers')
  findAll(@CurrentUser() user: any, @Query() query: QuerySuppliersDto) {
    return this.suppliersService.findAll(user.currentCompany.id, query);
  }

  @Get(':id')
  @RequireView('warehouse', 'suppliers')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.suppliersService.findOne(user.currentCompany.id, id);
  }

  @Patch(':id')
  @RequireEdit('warehouse', 'suppliers')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user.currentCompany.id, id, dto);
  }

  @Delete(':id')
  @RequireDelete('warehouse', 'suppliers')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.suppliersService.remove(user.currentCompany.id, id);
  }
}
