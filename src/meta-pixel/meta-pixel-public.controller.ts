import { Body, Controller, Get, Headers, HttpCode, Ip, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
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
    private config: ConfigService,
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
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    // Следим само НЕ-логнати посетители: собствените ни клиенти/служители не
    // са аудитория за реклама и само замърсяват статистиката.
    if (req.cookies?.['access_token']) {
      return { success: true, skipped: 'authenticated' };
    }
    // Админът отваря страници от лога с ?notrack=1 → трайна бисквитка, не го броим
    if (req.cookies?.['cs_notrack']) {
      return { success: true, skipped: 'notrack' };
    }
    // _fbp + fbc cookies се сетват от browser Pixel-а; критични за match quality.
    const fbp = (req.cookies?.['_fbp'] as string | undefined) || undefined;
    const fbc = (req.cookies?.['_fbc'] as string | undefined) || undefined;
    // Наш first-party идентификатор на браузъра — не зависи от Meta скрипта
    // (блокиран пиксел, Safari ITP) и е наличен още от първото събитие
    let visitorId = (req.cookies?.['cs_vid'] as string | undefined) || undefined;
    if (!visitorId) {
      visitorId = randomUUID();
      res.cookie('cs_vid', visitorId, this.visitorCookieOptions());
    }

    // Fire-and-forget — не чакаме Meta API-то.
    void this.events.sendEvent({
      eventName: dto.event_name,
      eventId: dto.event_id,
      eventSourceUrl: dto.event_source_url,
      referrer: dto.referrer,
      ip,
      userAgent,
      fbp,
      fbc,
      visitorId,
      email: dto.email,
      phone: dto.phone,
      contentName: dto.content_name,
    });

    return { success: true };
  }

  // 1 година, httpOnly; в прод върху .cortanasoft.com (сайт и API са поддомейни)
  private visitorCookieOptions() {
    const isProduction = this.config.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/',
      ...(isProduction && { domain: '.cortanasoft.com' }),
    };
  }
}
