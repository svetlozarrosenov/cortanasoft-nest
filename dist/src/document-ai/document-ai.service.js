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
var DocumentAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentAIService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let DocumentAIService = DocumentAIService_1 = class DocumentAIService {
    configService;
    logger = new common_1.Logger(DocumentAIService_1.name);
    isConfigured = false;
    projectId;
    location;
    processorId;
    constructor(configService) {
        this.configService = configService;
        this.initializeDocumentAI();
    }
    initializeDocumentAI() {
        this.projectId = this.configService.get('GOOGLE_CLOUD_PROJECT_ID');
        this.location =
            this.configService.get('GOOGLE_CLOUD_LOCATION') || 'eu';
        this.processorId = this.configService.get('GOOGLE_DOCUMENT_AI_PROCESSOR_ID');
        if (!this.projectId || !this.processorId) {
            this.logger.warn('Google Document AI not configured. Set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID in .env');
            return;
        }
        this.isConfigured = true;
        this.logger.log('Google Document AI configured successfully');
    }
    isEnabled() {
        return this.isConfigured;
    }
    async parseInvoice(imageUrl) {
        if (!this.isConfigured) {
            this.logger.warn('Document AI not configured, returning empty result');
            return { lineItems: [], confidence: 0 };
        }
        try {
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
            }
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const result = await this.callDocumentAI(base64Image, mimeType);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to parse invoice:', error);
            throw error;
        }
    }
    async parseInvoiceFromBase64(base64Data, mimeType) {
        if (!this.isConfigured) {
            this.logger.warn('Document AI not configured, returning empty result');
            return { lineItems: [], confidence: 0 };
        }
        try {
            const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
            const result = await this.callDocumentAI(base64Image, mimeType);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to parse invoice from base64:', error);
            throw error;
        }
    }
    async callDocumentAI(base64Image, mimeType) {
        const apiKey = this.configService.get('GOOGLE_CLOUD_API_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_CLOUD_API_KEY is not configured');
        }
        const endpoint = `https://${this.location}-documentai.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}:process?key=${apiKey}`;
        const requestBody = {
            rawDocument: {
                content: base64Image,
                mimeType: mimeType,
            },
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`Document AI API error: ${errorText}`);
            throw new Error(`Document AI API error: ${response.status}`);
        }
        const result = await response.json();
        return this.extractInvoiceData(result);
    }
    extractInvoiceData(apiResponse) {
        const document = apiResponse.document;
        if (!document) {
            return { lineItems: [], confidence: 0 };
        }
        const entities = document.entities || [];
        const parsed = {
            lineItems: [],
            confidence: 0,
            rawText: document.text,
        };
        let totalConfidence = 0;
        let confidenceCount = 0;
        for (const entity of entities) {
            const type = entity.type?.toLowerCase() || '';
            const value = entity.mentionText || entity.normalizedValue?.text || '';
            const confidence = entity.confidence || 0;
            totalConfidence += confidence;
            confidenceCount++;
            switch (type) {
                case 'invoice_id':
                case 'invoice_number':
                    parsed.invoiceNumber = value;
                    break;
                case 'invoice_date':
                    parsed.invoiceDate = this.parseDate(value, entity.normalizedValue);
                    break;
                case 'supplier_name':
                case 'vendor_name':
                    parsed.supplierName = value;
                    break;
                case 'supplier_tax_id':
                case 'vendor_tax_id':
                case 'supplier_vat':
                    parsed.supplierVatNumber = value;
                    break;
                case 'supplier_address':
                case 'vendor_address':
                    parsed.supplierAddress = value;
                    break;
                case 'total_amount':
                case 'total':
                    parsed.totalAmount = this.parseNumber(value, entity.normalizedValue);
                    break;
                case 'total_tax_amount':
                case 'vat_amount':
                case 'tax':
                    parsed.vatAmount = this.parseNumber(value, entity.normalizedValue);
                    break;
                case 'net_amount':
                case 'subtotal':
                    parsed.subtotal = this.parseNumber(value, entity.normalizedValue);
                    break;
                case 'line_item':
                    const lineItem = this.parseLineItem(entity);
                    if (lineItem) {
                        parsed.lineItems.push(lineItem);
                    }
                    break;
            }
        }
        parsed.confidence =
            confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
        return parsed;
    }
    parseLineItem(entity) {
        const properties = entity.properties || [];
        const item = {
            description: '',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
        };
        for (const prop of properties) {
            const type = prop.type?.toLowerCase() || '';
            const value = prop.mentionText || prop.normalizedValue?.text || '';
            switch (type) {
                case 'line_item/description':
                case 'description':
                    item.description = value;
                    break;
                case 'line_item/quantity':
                case 'quantity':
                    item.quantity = this.parseNumber(value, prop.normalizedValue) || 1;
                    break;
                case 'line_item/unit_price':
                case 'unit_price':
                    item.unitPrice = this.parseNumber(value, prop.normalizedValue) || 0;
                    break;
                case 'line_item/amount':
                case 'amount':
                case 'total':
                    item.totalPrice = this.parseNumber(value, prop.normalizedValue) || 0;
                    break;
                case 'line_item/product_code':
                case 'product_code':
                case 'sku':
                    item.productCode = value;
                    break;
            }
        }
        if (item.totalPrice === 0 && item.unitPrice > 0) {
            item.totalPrice = item.unitPrice * item.quantity;
        }
        if (item.unitPrice === 0 && item.totalPrice > 0 && item.quantity > 0) {
            item.unitPrice = item.totalPrice / item.quantity;
        }
        return item.description ? item : null;
    }
    parseDate(value, normalizedValue) {
        if (normalizedValue?.dateValue) {
            const { year, month, day } = normalizedValue.dateValue;
            if (year && month && day) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        const bgMatch = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (bgMatch) {
            const [, day, month, year] = bgMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return value;
    }
    parseNumber(value, normalizedValue) {
        if (normalizedValue?.moneyValue?.units) {
            return (Number(normalizedValue.moneyValue.units) +
                (normalizedValue.moneyValue.nanos || 0) / 1e9);
        }
        const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }
};
exports.DocumentAIService = DocumentAIService;
exports.DocumentAIService = DocumentAIService = DocumentAIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DocumentAIService);
//# sourceMappingURL=document-ai.service.js.map