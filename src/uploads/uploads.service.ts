import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import type { Readable } from 'stream';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID', '');
    this.bucket = this.config.get<string>('R2_BUCKET', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : undefined,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  /**
   * Upload file to R2 (private bucket).
   * Returns the R2 object key — NOT a public URL.
   */
  async uploadFile(
    companyId: string,
    folder: string,
    file: Express.Multer.File,
  ): Promise<{ key: string }> {
    if (!this.bucket) {
      throw new BadRequestException(
        'Cloudflare R2 не е конфигуриран. Моля, добавете R2_BUCKET в .env',
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Невалиден тип файл. Позволени са: JPEG, PNG, WebP, PDF',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Файлът е твърде голям. Максимален размер: 10MB',
      );
    }

    const ext =
      path.extname(file.originalname) || this.getExtension(file.mimetype);
    const key = `${folder}/${companyId}/${randomUUID()}${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      this.logger.log(`Uploaded file: ${key} for company ${companyId}`);

      return { key };
    } catch (error) {
      this.logger.error('R2 upload failed:', error);
      throw new BadRequestException('Грешка при качване на файла');
    }
  }

  /**
   * Get file stream from R2 for proxying through the backend.
   */
  async getFile(
    key: string,
  ): Promise<{ stream: Readable; contentType: string; contentLength: number }> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    return {
      stream: response.Body as Readable,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
    };
  }

  /** Legacy wrapper for invoice uploads */
  async uploadInvoice(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string; key: string }> {
    const { key } = await this.uploadFile(companyId, 'invoices', file);
    return { url: key, key };
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.bucket || !key) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
    }
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mimeType] || '';
  }
}
