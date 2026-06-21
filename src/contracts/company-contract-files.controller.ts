import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContractFileKind } from '@prisma/client';
import { ContractFilesService } from './contract-files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/contracts/:contractId/files')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyContractFilesController {
  constructor(private readonly service: ContractFilesService) {}

  @Post()
  @RequireCreate('erp', 'contracts')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('companyId') companyId: string,
    @Param('contractId') contractId: string,
    @CurrentUser() user: any,
    @Query('kind') kind: ContractFileKind | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Не е предоставен файл');
    }
    const created = await this.service.upload(
      companyId,
      user.id,
      contractId,
      file,
      kind,
    );
    return {
      ...created,
      fileUrl: `/api/companies/${companyId}/contracts/${contractId}/files/${created.id}/file`,
    };
  }

  @Get()
  @RequireView('erp', 'contracts')
  async findByContract(
    @Param('companyId') companyId: string,
    @Param('contractId') contractId: string,
  ) {
    const files = await this.service.findByContract(companyId, contractId);
    return files.map((f) => ({
      ...f,
      fileUrl: `/api/companies/${companyId}/contracts/${contractId}/files/${f.id}/file`,
    }));
  }

  /** Proxy — стриймва файла от R2 през backend (auth + tenant check). */
  @Get(':id/file')
  @RequireView('erp', 'contracts')
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
  @RequireDelete('erp', 'contracts')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
