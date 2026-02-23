import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
export declare class DocumentsService {
    private prisma;
    private uploads;
    constructor(prisma: PrismaService, uploads: UploadsService);
    upload(companyId: string, userId: string, entityType: string, entityId: string, file: Express.Multer.File): Promise<{
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        companyId: string;
        invoiceId: string | null;
        purchaseOrderId: string | null;
        goodsReceiptId: string | null;
        expenseId: string | null;
        fileName: string;
        fileUrl: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        uploadedById: string | null;
    }>;
    findByEntity(companyId: string, entityType: string, entityId: string): Promise<({
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        companyId: string;
        invoiceId: string | null;
        purchaseOrderId: string | null;
        goodsReceiptId: string | null;
        expenseId: string | null;
        fileName: string;
        fileUrl: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        uploadedById: string | null;
    })[]>;
    findOne(companyId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        invoiceId: string | null;
        purchaseOrderId: string | null;
        goodsReceiptId: string | null;
        expenseId: string | null;
        fileName: string;
        fileUrl: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        uploadedById: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        message: string;
    }>;
    getFileStream(companyId: string, id: string): Promise<{
        fileName: string;
        stream: import("stream").Readable;
        contentType: string;
        contentLength: number;
    }>;
    private validateEntity;
}
