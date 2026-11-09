import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ServiceOrdersService,
  SERVICE_ATTACHMENT_KINDS,
  ServiceAttachmentKind,
} from './service-orders.service';
import { ServiceProtocolsService } from './service-protocols.service';
import { WarrantiesService } from '../warranties/warranties.service';
import {
  CreateAcceptanceProtocolDto,
  UpdateAcceptanceProtocolDto,
} from '../acceptance-protocols/dto';
import {
  CreateAscertainmentProtocolDto,
  UpdateAscertainmentProtocolDto,
} from '../ascertainment-protocols/dto';
import {
  CreateServiceOrderDto,
  UpdateServiceOrderDto,
  QueryServiceOrdersDto,
  ChangeServiceOrderStatusDto,
  AddServicePartDto,
} from './dto';
import { IsOptional, IsString } from 'class-validator';

class IssueServiceWarrantyDto {
  @IsString()
  warrantyTemplateId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/service-orders')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyServiceOrdersController {
  constructor(
    private readonly orders: ServiceOrdersService,
    private readonly protocols: ServiceProtocolsService,
    private readonly warranties: WarrantiesService,
  ) {}

  @Post()
  @RequireCreate('service', 'orders')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.orders.create(companyId, user?.id, dto);
  }

  @Get()
  @RequireView('service', 'orders')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryServiceOrdersDto,
  ) {
    return this.orders.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('service', 'orders')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.orders.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('service', 'orders')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.orders.update(companyId, id, dto);
  }

  @Patch(':id/status')
  @RequireEdit('service', 'orders')
  changeStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ChangeServiceOrderStatusDto,
  ) {
    return this.orders.changeStatus(companyId, id, user?.id, dto);
  }

  @Post(':id/parts')
  @RequireEdit('service', 'orders')
  addPart(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AddServicePartDto,
  ) {
    return this.orders.addPart(companyId, id, dto);
  }

  @Delete(':id/parts/:partId')
  @RequireEdit('service', 'orders')
  removePart(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('partId') partId: string,
  ) {
    return this.orders.removePart(companyId, id, partId);
  }

  // Качване в R2 (multipart поле `file`, вид на файла в ?kind=)
  @Post(':id/attachments')
  @RequireEdit('service', 'orders')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: string,
  ) {
    if (!file) throw new BadRequestException('Липсва файл');
    if (
      kind &&
      !SERVICE_ATTACHMENT_KINDS.includes(kind as ServiceAttachmentKind)
    ) {
      throw new BadRequestException('Невалиден вид на файла');
    }
    return this.orders.addAttachment(
      companyId,
      id,
      user?.id,
      file,
      kind as ServiceAttachmentKind | undefined,
    );
  }

  /** Проксира файла от R2 през бекенда (private bucket). */
  @Get(':id/attachments/:attachmentId/file')
  @RequireView('service', 'orders')
  async getAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, contentType, fileName } =
      await this.orders.getAttachmentStream(companyId, id, attachmentId);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(':id/attachments/:attachmentId')
  @RequireEdit('service', 'orders')
  removeAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.orders.removeAttachment(companyId, id, attachmentId);
  }

  @Get(':id/protocols')
  @RequireView('service', 'orders')
  listProtocols(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.protocols.listForOrder(companyId, id);
  }

  // ==== Протоколи с пълен контрол (service.orders права, не erp.protocols) ====

  @Post(':id/protocols/acceptance')
  @RequireEdit('service', 'orders')
  createAcceptanceProtocol(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAcceptanceProtocolDto,
  ) {
    return this.protocols.createCustom(
      companyId,
      id,
      user?.id,
      'acceptance',
      dto,
    );
  }

  @Get(':id/protocols/acceptance/:protocolId')
  @RequireView('service', 'orders')
  getAcceptanceProtocol(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
  ) {
    return this.protocols.getOne(companyId, id, 'acceptance', protocolId);
  }

  @Patch(':id/protocols/acceptance/:protocolId')
  @RequireEdit('service', 'orders')
  updateAcceptanceProtocol(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
    @Body() dto: UpdateAcceptanceProtocolDto,
  ) {
    return this.protocols.updateCustom(
      companyId,
      id,
      'acceptance',
      protocolId,
      dto,
    );
  }

  @Post(':id/protocols/acceptance/:protocolId/cancel')
  @RequireEdit('service', 'orders')
  cancelAcceptanceProtocol(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
  ) {
    return this.protocols.cancelCustom(companyId, id, 'acceptance', protocolId);
  }

  @Post(':id/protocols/ascertainment-full')
  @RequireEdit('service', 'orders')
  createAscertainmentProtocolFull(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAscertainmentProtocolDto,
  ) {
    return this.protocols.createCustom(
      companyId,
      id,
      user?.id,
      'ascertainment',
      dto,
    );
  }

  @Get(':id/protocols/ascertainment/:protocolId')
  @RequireView('service', 'orders')
  getAscertainmentProtocol(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
  ) {
    return this.protocols.getOne(companyId, id, 'ascertainment', protocolId);
  }

  @Patch(':id/protocols/ascertainment/:protocolId')
  @RequireEdit('service', 'orders')
  updateAscertainmentProtocol(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
    @Body() dto: UpdateAscertainmentProtocolDto,
  ) {
    return this.protocols.updateCustom(
      companyId,
      id,
      'ascertainment',
      protocolId,
      dto,
    );
  }

  @Post(':id/protocols/ascertainment/:protocolId/cancel')
  @RequireEdit('service', 'orders')
  cancelAscertainmentProtocol(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
  ) {
    return this.protocols.cancelCustom(
      companyId,
      id,
      'ascertainment',
      protocolId,
    );
  }

  // Гаранционните шаблони за модала „Издай гаранция" — през service права,
  // за да не изискваме warranties.templates view от сервизния екип.
  @Get(':id/warranty-templates')
  @RequireView('service', 'orders')
  warrantyTemplates(@Param('companyId') companyId: string) {
    return this.warranties.findAllTemplates(companyId, {
      isActive: true,
      limit: 100,
    } as any);
  }

  // Ремонтна гаранция през модул Гаранции (същите шаблони и номерация)
  @Post(':id/issue-warranty')
  @RequireEdit('service', 'orders')
  issueWarranty(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: IssueServiceWarrantyDto,
  ) {
    return this.warranties.issueForServiceOrder(companyId, {
      serviceOrderId: id,
      warrantyTemplateId: dto.warrantyTemplateId,
      notes: dto.notes,
    });
  }

  @Get(':id/warranties')
  @RequireView('service', 'orders')
  listWarranties(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.warranties.listForServiceOrder(companyId, id);
  }
}
