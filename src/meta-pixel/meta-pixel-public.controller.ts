import { Body, Controller, Get, Headers, HttpCode, Ip, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MetaPixelService } from './meta-pixel.service';
import { MetaPixelEventsService } from './meta-pixel-events.service';
import { TrackMetaPixelEventDto } from './dto';

/**
 * Public controller for Meta Pixel — exposes the active script blob so the
 * public site can inject it into <head>. No authentication required.
 *
 * Also exposes /track which forwards client-fired events to CAPI for
 * server-side dedup with the browser Pixel (hybrid setup).
 */
@Controller('public/meta-pixel')
export class MetaPixelPublicController {
  constructor(
    private service: MetaPixelService,
    private events: MetaPixelEventsService,
  ) {}

  @Get('script')
  async getScript() {
    const data = await this.service.getPublicScript();
    return { success: true, ...(data ?? { scriptHtml: null, pixelId: null }) };
  }

  @Post('track')
  @HttpCode(202)
  async track(
    @Body() dto: TrackMetaPixelEventDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    // _fbp + fbc cookies се сетват от browser Pixel-а; критични за match quality.
    const fbp = (req.cookies?.['_fbp'] as string | undefined) || undefined;
    const fbc = (req.cookies?.['_fbc'] as string | undefined) || undefined;

    // Fire-and-forget — не чакаме Meta API-то.
    void this.events.sendEvent({
      eventName: dto.event_name,
      eventId: dto.event_id,
      eventSourceUrl: dto.event_source_url,
      ip,
      userAgent,
      fbp,
      fbc,
      email: dto.email,
      phone: dto.phone,
      contentName: dto.content_name,
    });

    return { success: true };
  }
}
