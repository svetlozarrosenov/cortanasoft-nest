import { ConfigService } from '@nestjs/config';
export interface InvoiceLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productCode?: string;
}
export interface ParsedInvoiceData {
    invoiceNumber?: string;
    invoiceDate?: string;
    supplierName?: string;
    supplierVatNumber?: string;
    supplierAddress?: string;
    totalAmount?: number;
    vatAmount?: number;
    subtotal?: number;
    lineItems: InvoiceLineItem[];
    rawText?: string;
    confidence: number;
}
export declare class DocumentAIService {
    private configService;
    private readonly logger;
    private isConfigured;
    private projectId;
    private location;
    private processorId;
    constructor(configService: ConfigService);
    private initializeDocumentAI;
    isEnabled(): boolean;
    parseInvoice(imageUrl: string): Promise<ParsedInvoiceData>;
    parseInvoiceFromBase64(base64Data: string, mimeType: string): Promise<ParsedInvoiceData>;
    private callDocumentAI;
    private extractInvoiceData;
    private parseLineItem;
    private parseDate;
    private parseNumber;
}
