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
import { ContactSubmissionsService } from './contact-submissions.service';
import { UpdateContactSubmissionDto, QueryContactSubmissionsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

/**
 * Admin controller for contact submissions (requires super admin auth)
 */
@Controller('admin/contact-submissions')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminContactSubmissionsController {
  constructor(private contactSubmissionsService: ContactSubmissionsService) {}

  /**
   * Get all contact submissions with pagination and filters
   * GET /api/admin/contact-submissions
   */
  @Get()
  async findAll(@Query() query: QueryContactSubmissionsDto) {
    const result = await this.contactSubmissionsService.findAll(query);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get statistics for contact submissions
   * GET /api/admin/contact-submissions/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.contactSubmissionsService.getStats();
    return {
      success: true,
      stats,
    };
  }

  /**
   * Get all possible statuses
   * GET /api/admin/contact-submissions/statuses
   */
  @Get('statuses')
  getStatuses() {
    return {
      success: true,
      statuses: this.contactSubmissionsService.getStatuses(),
    };
  }

  /**
   * Get a single contact submission
   * GET /api/admin/contact-submissions/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const submission = await this.contactSubmissionsService.findOne(id);
    return {
      success: true,
      submission,
    };
  }

  /**
   * Update a contact submission
   * PUT /api/admin/contact-submissions/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContactSubmissionDto) {
    const submission = await this.contactSubmissionsService.update(id, dto);
    return {
      success: true,
      submission,
    };
  }

  /**
   * Delete a contact submission
   * DELETE /api/admin/contact-submissions/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.contactSubmissionsService.remove(id);
    return {
      success: true,
      message: 'Contact submission deleted successfully',
    };
  }
}
