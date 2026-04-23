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
import { DemoRequestsService } from './demo-requests.service';
import {
  UpdateDemoRequestDto,
  QueryDemoRequestsDto,
  CreateDemoRequestTaskDto,
  UpdateDemoRequestTaskDto,
  CreateDemoRequestNoteDto,
  UpdateDemoRequestNoteDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

/**
 * Admin controller for demo requests (requires super admin auth)
 */
@Controller('admin/demo-requests')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminDemoRequestsController {
  constructor(private demoRequestsService: DemoRequestsService) {}

  @Get()
  async findAll(@Query() query: QueryDemoRequestsDto) {
    const result = await this.demoRequestsService.findAll(query);
    return { success: true, ...result };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.demoRequestsService.getStats();
    return { success: true, stats };
  }

  @Get('statuses')
  getStatuses() {
    return {
      success: true,
      statuses: this.demoRequestsService.getStatuses(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const demoRequest = await this.demoRequestsService.findOne(id);
    return { success: true, demoRequest };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDemoRequestDto) {
    const demoRequest = await this.demoRequestsService.update(id, dto);
    return { success: true, demoRequest };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.demoRequestsService.remove(id);
    return { success: true, message: 'Demo request deleted successfully' };
  }

  // ==================== TASKS ====================

  @Post(':id/tasks')
  async createTask(
    @Param('id') id: string,
    @Body() dto: CreateDemoRequestTaskDto,
  ) {
    const task = await this.demoRequestsService.createTask(id, dto);
    return { success: true, task };
  }

  @Patch(':id/tasks/:taskId')
  async updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateDemoRequestTaskDto,
  ) {
    const task = await this.demoRequestsService.updateTask(id, taskId, dto);
    return { success: true, task };
  }

  @Delete(':id/tasks/:taskId')
  @HttpCode(200)
  async deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    await this.demoRequestsService.deleteTask(id, taskId);
    return { success: true };
  }

  // ==================== NOTES ====================

  @Post(':id/notes')
  async createNote(
    @Param('id') id: string,
    @Body() dto: CreateDemoRequestNoteDto,
  ) {
    const note = await this.demoRequestsService.createNote(id, dto);
    return { success: true, note };
  }

  @Patch(':id/notes/:noteId')
  async updateNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateDemoRequestNoteDto,
  ) {
    const note = await this.demoRequestsService.updateNote(id, noteId, dto);
    return { success: true, note };
  }

  @Delete(':id/notes/:noteId')
  @HttpCode(200)
  async deleteNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    await this.demoRequestsService.deleteNote(id, noteId);
    return { success: true };
  }
}
