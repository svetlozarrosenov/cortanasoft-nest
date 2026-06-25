import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ContactSubmissionsService } from './contact-submissions.service';
import {
  UpdateContactSubmissionDto,
  QueryContactSubmissionsDto,
  CreateContactSubmissionTaskDto,
  UpdateContactSubmissionTaskDto,
  CreateContactSubmissionNoteDto,
  UpdateContactSubmissionNoteDto,
} from './dto';
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
      contactSubmission: submission,
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
      contactSubmission: submission,
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

  // ==================== TASKS ====================

  @Post(':id/tasks')
  async createTask(
    @Param('id') id: string,
    @Body() dto: CreateContactSubmissionTaskDto,
  ) {
    const task = await this.contactSubmissionsService.createTask(id, dto);
    return { success: true, task };
  }

  @Patch(':id/tasks/:taskId')
  async updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateContactSubmissionTaskDto,
  ) {
    const task = await this.contactSubmissionsService.updateTask(
      id,
      taskId,
      dto,
    );
    return { success: true, task };
  }

  @Delete(':id/tasks/:taskId')
  @HttpCode(200)
  async deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    await this.contactSubmissionsService.deleteTask(id, taskId);
    return { success: true };
  }

  // ==================== NOTES ====================

  @Post(':id/notes')
  async createNote(
    @Param('id') id: string,
    @Body() dto: CreateContactSubmissionNoteDto,
  ) {
    const note = await this.contactSubmissionsService.createNote(id, dto);
    return { success: true, note };
  }

  @Patch(':id/notes/:noteId')
  async updateNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateContactSubmissionNoteDto,
  ) {
    const note = await this.contactSubmissionsService.updateNote(
      id,
      noteId,
      dto,
    );
    return { success: true, note };
  }

  @Delete(':id/notes/:noteId')
  @HttpCode(200)
  async deleteNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    await this.contactSubmissionsService.deleteNote(id, noteId);
    return { success: true };
  }
}
