"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const uploads_service_1 = require("../uploads/uploads.service");
const ENTITY_TYPE_MAP = {
    goodsReceipt: 'goodsReceiptId',
    invoice: 'invoiceId',
    expense: 'expenseId',
    purchaseOrder: 'purchaseOrderId',
};
const ENTITY_MODEL_MAP = {
    goodsReceipt: 'goodsReceipt',
    invoice: 'invoice',
    expense: 'expense',
    purchaseOrder: 'purchaseOrder',
};
let DocumentsService = class DocumentsService {
    prisma;
    uploads;
    constructor(prisma, uploads) {
        this.prisma = prisma;
        this.uploads = uploads;
    }
    async upload(companyId, userId, entityType, entityId, file) {
        if (!ENTITY_TYPE_MAP[entityType]) {
            throw new common_1.BadRequestException(`Невалиден тип: ${entityType}. Позволени: ${Object.keys(ENTITY_TYPE_MAP).join(', ')}`);
        }
        const type = entityType;
        const fkField = ENTITY_TYPE_MAP[type];
        await this.validateEntity(companyId, type, entityId);
        const { key } = await this.uploads.uploadFile(companyId, 'documents', file);
        return this.prisma.document.create({
            data: {
                fileName: file.originalname,
                fileUrl: key,
                fileKey: key,
                fileSize: file.size,
                mimeType: file.mimetype,
                companyId,
                uploadedById: userId,
                [fkField]: entityId,
            },
            include: {
                uploadedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async findByEntity(companyId, entityType, entityId) {
        if (!ENTITY_TYPE_MAP[entityType]) {
            throw new common_1.BadRequestException(`Невалиден тип: ${entityType}`);
        }
        const fkField = ENTITY_TYPE_MAP[entityType];
        return this.prisma.document.findMany({
            where: {
                companyId,
                [fkField]: entityId,
            },
            include: {
                uploadedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(companyId, id) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Документът не е намерен');
        }
        return document;
    }
    async remove(companyId, id) {
        const document = await this.findOne(companyId, id);
        await this.uploads.deleteFile(document.fileKey);
        await this.prisma.document.delete({ where: { id } });
        return { message: 'Документът е изтрит успешно' };
    }
    async getFileStream(companyId, id) {
        const document = await this.findOne(companyId, id);
        const file = await this.uploads.getFile(document.fileKey);
        return {
            ...file,
            fileName: document.fileName,
        };
    }
    async validateEntity(companyId, entityType, entityId) {
        const modelName = ENTITY_MODEL_MAP[entityType];
        const entity = await this.prisma[modelName].findFirst({
            where: { id: entityId, companyId },
            select: { id: true },
        });
        if (!entity) {
            throw new common_1.NotFoundException(`${entityType} с ID ${entityId} не е намерен в тази компания`);
        }
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        uploads_service_1.UploadsService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map