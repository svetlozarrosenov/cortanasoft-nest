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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentAIController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const document_ai_service_1 = require("./document-ai.service");
const prisma_service_1 = require("../prisma/prisma.service");
class ScanInvoiceDto {
    imageUrl;
    base64Image;
    mimeType;
}
let DocumentAIController = class DocumentAIController {
    documentAIService;
    prisma;
    constructor(documentAIService, prisma) {
        this.documentAIService = documentAIService;
        this.prisma = prisma;
    }
    getStatus() {
        return {
            enabled: this.documentAIService.isEnabled(),
            name: 'Cortana',
            capabilities: ['invoice_scan', 'text_extraction'],
        };
    }
    async scanInvoice(companyId, dto) {
        let parsedData;
        if (dto.base64Image) {
            parsedData = await this.documentAIService.parseInvoiceFromBase64(dto.base64Image, dto.mimeType || 'image/jpeg');
        }
        else if (dto.imageUrl) {
            parsedData = await this.documentAIService.parseInvoice(dto.imageUrl);
        }
        else {
            throw new Error('Either imageUrl or base64Image is required');
        }
        const matchedProducts = [];
        if (parsedData.lineItems.length > 0) {
            const companyProducts = await this.prisma.product.findMany({
                where: { companyId, isActive: true },
                select: { id: true, name: true, sku: true },
            });
            for (const lineItem of parsedData.lineItems) {
                const match = this.findBestProductMatch(lineItem.description, lineItem.productCode, companyProducts);
                if (match) {
                    matchedProducts.push({
                        ...match,
                        originalDescription: lineItem.description,
                    });
                }
            }
        }
        let suggestedSupplier;
        if (parsedData.supplierName || parsedData.supplierVatNumber) {
            const orConditions = [];
            if (parsedData.supplierName) {
                orConditions.push({
                    name: {
                        contains: parsedData.supplierName,
                        mode: 'insensitive',
                    },
                });
            }
            if (parsedData.supplierVatNumber) {
                orConditions.push({
                    vatNumber: parsedData.supplierVatNumber,
                });
            }
            const suppliers = await this.prisma.supplier.findMany({
                where: {
                    companyId,
                    isActive: true,
                    ...(orConditions.length > 0 ? { OR: orConditions } : {}),
                },
                select: { id: true, name: true },
                take: 1,
            });
            if (suppliers.length > 0) {
                suggestedSupplier = suppliers[0];
            }
        }
        return {
            ...parsedData,
            matchedProducts,
            suggestedSupplier,
        };
    }
    findBestProductMatch(description, productCode, products) {
        const normalizedDesc = description.toLowerCase().trim();
        if (productCode) {
            const skuMatch = products.find((p) => p.sku?.toLowerCase() === productCode.toLowerCase());
            if (skuMatch) {
                return {
                    productId: skuMatch.id,
                    productName: skuMatch.name,
                    sku: skuMatch.sku,
                    confidence: 1.0,
                };
            }
        }
        let bestMatch = null;
        let bestScore = 0;
        for (const product of products) {
            const productName = product.name.toLowerCase();
            const score = this.calculateSimilarity(normalizedDesc, productName);
            if (score > bestScore && score > 0.3) {
                bestScore = score;
                bestMatch = {
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    confidence: score,
                };
            }
        }
        return bestMatch;
    }
    calculateSimilarity(str1, str2) {
        const words1 = str1.split(/\s+/).filter((w) => w.length > 2);
        const words2 = str2.split(/\s+/).filter((w) => w.length > 2);
        if (words1.length === 0 || words2.length === 0)
            return 0;
        let matches = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1.includes(word2) || word2.includes(word1)) {
                    matches++;
                    break;
                }
            }
        }
        return matches / Math.max(words1.length, words2.length);
    }
};
exports.DocumentAIController = DocumentAIController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DocumentAIController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('scan-invoice'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ScanInvoiceDto]),
    __metadata("design:returntype", Promise)
], DocumentAIController.prototype, "scanInvoice", null);
exports.DocumentAIController = DocumentAIController = __decorate([
    (0, common_1.Controller)('companies/:companyId/cortana'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [document_ai_service_1.DocumentAIService,
        prisma_service_1.PrismaService])
], DocumentAIController);
//# sourceMappingURL=document-ai.controller.js.map