import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    upload(companyId: string, user: any, entityType: string, entityId: string, file: Express.Multer.File): Promise<{
        fileUrl: string;
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        createdAt: Date;
        id: string;
        companyId: string;
        purchaseOrderId: string | null;
        goodsReceiptId: string | null;
        invoiceId: string | null;
        expenseId: string | null;
        fileName: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        uploadedById: string | null;
    }>;
    findByEntity(companyId: string, entityType: string, entityId: string): Promise<{
        fileUrl: string;
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        createdAt: Date;
        id: string;
        companyId: string;
        purchaseOrderId: string | null;
        goodsReceiptId: string | null;
        invoiceId: string | null;
        expenseId: string | null;
        fileName: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        uploadedById: string | null;
    }[]>;
    getFile(companyId: string, id: string, res: Response): Promise<StreamableFile>;
    remove(companyId: string, id: string): Promise<{
        message: string;
    }>;
}
