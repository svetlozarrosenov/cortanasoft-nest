import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';

/**
 * Public file proxy. Exposes a small whitelist of namespaces that we explicitly
 * want browser-fetchable (currently only `logos/`). The R2 bucket itself stays
 * private — every served byte goes through this controller.
 *
 * Keys contain a UUID in the filename, so the URL is unguessable, but we still
 * limit by namespace to avoid any chance of leaking other R2 content (invoices,
 * documents, etc).
 */
@Controller('public/files')
export class PublicFilesController {
  constructor(private uploads: UploadsService) {}

  @Get('logos/:companyId/:filename')
  @Header('Cache-Control', 'public, max-age=3600')
  async serveLogo(
    @Param('companyId') companyId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const key = `logos/${companyId}/${filename}`;
    try {
      const { stream, contentType, contentLength } = await this.uploads.getFile(key);
      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength.toString());
      stream.pipe(res);
    } catch {
      throw new NotFoundException('Файлът не е намерен');
    }
  }
}
