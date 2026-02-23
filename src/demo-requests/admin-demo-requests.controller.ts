import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DemoRequestsService } from './demo-requests.service';
import { UpdateDemoRequestDto, QueryDemoRequestsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

/**
 * Admin controller for demo requests (requires super admin auth)
 */
@Controller('admin/demo-requests')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminDemoRequestsController {
  constructor(private demoRequestsService: DemoRequestsService) {}

  /**
   * Get all demo requests with pagination and filters
   * GET /api/admin/demo-requests
   */
  @Get()
  async findAll(@Query() query: QueryDemoRequestsDto) {
    const result = await this.demoRequestsService.findAll(query);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get statistics for demo requests
   * GET /api/admin/demo-requests/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.demoRequestsService.getStats();
    return {
      success: true,
      stats,
    };
  }

  /**
   * Get all possible statuses
   * GET /api/admin/demo-requests/statuses
   */
  @Get('statuses')
  getStatuses() {
    return {
      success: true,
      statuses: this.demoRequestsService.getStatuses(),
    };
  }

  /**
   * Get a single demo request
   * GET /api/admin/demo-requests/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const demoRequest = await this.demoRequestsService.findOne(id);
    return {
      success: true,
      demoRequest,
    };
  }

  /**
   * Update a demo request
   * PUT /api/admin/demo-requests/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDemoRequestDto) {
    const demoRequest = await this.demoRequestsService.update(id, dto);
    return {
      success: true,
      demoRequest,
    };
  }

  /**
   * Delete a demo request
   * DELETE /api/admin/demo-requests/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.demoRequestsService.remove(id);
    return {
      success: true,
      message: 'Demo request deleted successfully',
    };
  }
}
