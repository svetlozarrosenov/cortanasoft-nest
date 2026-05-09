import { Controller, Post, Body, Req, Ip, Headers } from '@nestjs/common';
import type { Request } from 'express';
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
  async create(
    @Body() dto: CreateDemoRequestDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('referer') referer: string | undefined,
  ) {
    const demoRequest = await this.demoRequestsService.create(dto, {
      ip,
      userAgent,
      fbp: req.cookies?.['_fbp'] as string | undefined,
      fbc: req.cookies?.['_fbc'] as string | undefined,
      eventSourceUrl: referer,
    });
    return {
      success: true,
      message: 'Заявката е изпратена успешно!',
      demoRequest: {
        id: demoRequest.id,
        name: demoRequest.name,
        email: demoRequest.email,
      },
    };
  }
}
