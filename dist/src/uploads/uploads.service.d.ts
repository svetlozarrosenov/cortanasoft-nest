import { ConfigService } from '@nestjs/config';
import type { Readable } from 'stream';
export declare class UploadsService {
    private config;
    private readonly logger;
    private s3;
    private bucket;
    constructor(config: ConfigService);
    uploadFile(companyId: string, folder: string, file: Express.Multer.File): Promise<{
        key: string;
    }>;
    getFile(key: string): Promise<{
        stream: Readable;
        contentType: string;
        contentLength: number;
    }>;
    uploadInvoice(companyId: string, file: Express.Multer.File): Promise<{
        url: string;
        key: string;
    }>;
    deleteFile(key: string): Promise<void>;
    private getExtension;
}
