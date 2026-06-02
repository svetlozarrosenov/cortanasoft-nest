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
import { EmployeeDocumentFilesService } from './employee-document-files.service';
import { EmployeeDocumentFileKind } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/employee-record-files')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyEmployeeDocumentFilesController {
  constructor(private readonly service: EmployeeDocumentFilesService) {}

  @Post()
  @RequireCreate('hr', 'employeeRecords')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('kind') kind: EmployeeDocumentFileKind | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Не е предоставен файл');
    }
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType и entityId са задължителни');
    }

    const created = await this.service.upload(
      companyId,
      user.id,
      entityType,
      entityId,
      file,
      kind,
    );

    return {
      ...created,
      fileUrl: `/api/companies/${companyId}/employee-record-files/${created.id}/file`,
    };
  }

  @Get()
  @RequireView('hr', 'employeeRecords')
  async findByEntity(
    @Param('companyId') companyId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType и entityId са задължителни');
    }
    const files = await this.service.findByEntity(
      companyId,
      entityType,
      entityId,
    );
    return files.map((f) => ({
      ...f,
      fileUrl: `/api/companies/${companyId}/employee-record-files/${f.id}/file`,
    }));
  }

  /** Proxy — стриймва файла от R2 през backend (auth + tenant check). */
  @Get(':id/file')
  @RequireView('hr', 'employeeRecords')
  async getFile(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, contentType, fileName } =
      await this.service.getFileStream(companyId, id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'private, max-age=3600',
    });

    return new StreamableFile(stream);
  }

  @Delete(':id')
  @RequireDelete('hr', 'employeeRecords')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.remove(companyId, id);
  }
}
