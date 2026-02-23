import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    uploadInvoice(companyId: string, file: Express.Multer.File): Promise<{
        url: string;
        key: string;
    }>;
}
