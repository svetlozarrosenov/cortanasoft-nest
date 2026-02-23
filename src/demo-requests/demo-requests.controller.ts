import { Controller, Post, Body } from '@nestjs/common';
import { DemoRequestsService } from './demo-requests.service';
import { CreateDemoRequestDto } from './dto';

/**
 * Public controller for demo requests (no auth required)
 */
@Controller('demo-requests')
export class DemoRequestsController {
  constructor(private demoRequestsService: DemoRequestsService) {}

  /**
   * Create a new demo request from the public website
   * POST /api/demo-requests
   */
  @Post()
  async create(@Body() dto: CreateDemoRequestDto) {
    const demoRequest = await this.demoRequestsService.create(dto);
    return {
      success: true,
      message: 'Заявката е изпратена успешно. Ще се свържем с вас скоро!',
      demoRequest: {
        id: demoRequest.id,
        name: demoRequest.name,
        email: demoRequest.email,
      },
    };
  }
}
