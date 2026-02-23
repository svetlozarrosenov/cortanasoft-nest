import { DocumentAIService, ParsedInvoiceData } from './document-ai.service';
import { PrismaService } from '../prisma/prisma.service';
declare class ScanInvoiceDto {
    imageUrl?: string;
    base64Image?: string;
    mimeType?: string;
}
interface ProductMatch {
    productId: string;
    productName: string;
    sku: string | null;
    confidence: number;
    originalDescription: string;
}
interface ScanResult extends ParsedInvoiceData {
    matchedProducts: ProductMatch[];
    suggestedSupplier?: {
        id: string;
        name: string;
    };
}
export declare class DocumentAIController {
    private documentAIService;
    private prisma;
    constructor(documentAIService: DocumentAIService, prisma: PrismaService);
    getStatus(): {
        enabled: boolean;
        name: string;
        capabilities: string[];
    };
    scanInvoice(companyId: string, dto: ScanInvoiceDto): Promise<ScanResult>;
    private findBestProductMatch;
    private calculateSimilarity;
}
export {};
