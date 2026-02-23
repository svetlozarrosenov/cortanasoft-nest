import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/documents')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Не е предоставен файл');
    }
    if (!entityType || !entityId) {
      throw new BadRequestException(
        'entityType и entityId са задължителни',
      );
    }

    const doc = await this.documentsService.upload(
      companyId,
      user.id,
      entityType,
      entityId,
      file,
    );

    // Return with proxy URL instead of R2 key
    return {
      ...doc,
      fileUrl: `/api/companies/${companyId}/documents/${doc.id}/file`,
    };
  }

  @Get()
  async findByEntity(
    @Param('companyId') companyId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    if (!entityType || !entityId) {
      throw new BadRequestException(
        'entityType и entityId са задължителни',
      );
    }

    const docs = await this.documentsService.findByEntity(
      companyId,
      entityType,
      entityId,
    );

    // Replace fileUrl with proxy URL for each document
    return docs.map((doc) => ({
      ...doc,
      fileUrl: `/api/companies/${companyId}/documents/${doc.id}/file`,
    }));
  }

  /**
   * Proxy endpoint — streams file from R2 through backend.
   * Auth + tenant check ensures only authorized users can access.
   */
  @Get(':id/file')
  async getFile(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, contentType, fileName } =
      await this.documentsService.getFileStream(companyId, id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'private, max-age=3600',
    });

    return new StreamableFile(stream);
  }

  @Delete(':id')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.remove(companyId, id);
  }
}
