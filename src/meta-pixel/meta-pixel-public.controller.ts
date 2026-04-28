import { Controller, Get } from '@nestjs/common';
import { MetaPixelService } from './meta-pixel.service';

/**
 * Public controller for Meta Pixel — exposes the active script blob so the
 * public site can inject it into <head>. No authentication required.
 */
@Controller('public/meta-pixel')
export class MetaPixelPublicController {
  constructor(private service: MetaPixelService) {}

  @Get('script')
  async getScript() {
    const data = await this.service.getPublicScript();
    return { success: true, ...(data ?? { scriptHtml: null, pixelId: null }) };
  }
}
