import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CasesService } from './cases.service';
import { PublicCaseReplyDto } from './dto';

/**
 * Публична страница на казус — без логин, токенът (24 байта) е тайната.
 * Отваря се от линка, който фирмата праща на клиента си по имейл.
 */
@Controller('case-tracking')
@UseGuards(ThrottlerGuard)
export class CasesPublicController {
  constructor(private cases: CasesService) {}

  @Get(':token')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  view(@Param('token') token: string) {
    return this.cases.publicView(token);
  }

  @Post(':token/reply')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    long: { limit: 20, ttl: 600000 },
  })
  reply(@Param('token') token: string, @Body() dto: PublicCaseReplyDto) {
    return this.cases.publicReply(token, dto.body);
  }

  @Get(':token/attachments/:attachmentId')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  async attachment(
    @Param('token') token: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, contentType, fileName } =
      await this.cases.getPublicAttachmentStream(token, attachmentId);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return new StreamableFile(stream);
  }
}
