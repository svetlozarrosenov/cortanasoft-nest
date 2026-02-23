import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/uploads')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('invoice')
  @RequireCreate('erp', 'goodsReceipts')
  @UseInterceptors(FileInterceptor('file'))
  async uploadInvoice(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Не е предоставен файл');
    }

    return this.uploadsService.uploadInvoice(companyId, file);
  }
}
