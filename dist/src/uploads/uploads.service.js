"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
let UploadsService = UploadsService_1 = class UploadsService {
    config;
    logger = new common_1.Logger(UploadsService_1.name);
    s3;
    bucket;
    constructor(config) {
        this.config = config;
        const accountId = this.config.get('R2_ACCOUNT_ID', '');
        this.bucket = this.config.get('R2_BUCKET', '');
        this.s3 = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: accountId
                ? `https://${accountId}.r2.cloudflarestorage.com`
                : undefined,
            credentials: {
                accessKeyId: this.config.get('R2_ACCESS_KEY_ID', ''),
                secretAccessKey: this.config.get('R2_SECRET_ACCESS_KEY', ''),
            },
        });
    }
    async uploadFile(companyId, folder, file) {
        if (!this.bucket) {
            throw new common_1.BadRequestException('Cloudflare R2 не е конфигуриран. Моля, добавете R2_BUCKET в .env');
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Невалиден тип файл. Позволени са: JPEG, PNG, WebP, PDF');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new common_1.BadRequestException('Файлът е твърде голям. Максимален размер: 10MB');
        }
        const ext = path.extname(file.originalname) || this.getExtension(file.mimetype);
        const key = `${folder}/${companyId}/${(0, crypto_1.randomUUID)()}${ext}`;
        try {
            await this.s3.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));
            this.logger.log(`Uploaded file: ${key} for company ${companyId}`);
            return { key };
        }
        catch (error) {
            this.logger.error('R2 upload failed:', error);
            throw new common_1.BadRequestException('Грешка при качване на файла');
        }
    }
    async getFile(key) {
        const response = await this.s3.send(new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
        return {
            stream: response.Body,
            contentType: response.ContentType || 'application/octet-stream',
            contentLength: response.ContentLength || 0,
        };
    }
    async uploadInvoice(companyId, file) {
        const { key } = await this.uploadFile(companyId, 'invoices', file);
        return { url: key, key };
    }
    async deleteFile(key) {
        if (!this.bucket || !key)
            return;
        try {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            this.logger.log(`Deleted file: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file ${key}:`, error);
        }
    }
    getExtension(mimeType) {
        const map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'application/pdf': '.pdf',
        };
        return map[mimeType] || '';
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = UploadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map