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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.currentCompany.id, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(user.currentCompany.id, query);
  }

  @Get('categories')
  findAllCategories(@CurrentUser() user: any) {
    return this.productsService.findAllCategories(user.currentCompany.id);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() user: any,
    @Body() data: { name: string; description?: string; parentId?: string },
  ) {
    return this.productsService.createCategory(user.currentCompany.id, data);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; parentId?: string },
  ) {
    return this.productsService.updateCategory(
      user.currentCompany.id,
      id,
      data,
    );
  }

  @Delete('categories/:id')
  removeCategory(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.removeCategory(user.currentCompany.id, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.findOne(user.currentCompany.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.currentCompany.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.remove(user.currentCompany.id, id);
  }
}
