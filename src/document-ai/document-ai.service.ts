import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class DocumentAIService {
  private readonly logger = new Logger(DocumentAIService.name);
  private isConfigured = false;
  private projectId: string | undefined;
  private location: string | undefined;
  private processorId: string | undefined;

  constructor(private configService: ConfigService) {
    this.initializeDocumentAI();
  }

  private initializeDocumentAI() {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    this.location =
      this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'eu';
    this.processorId = this.configService.get<string>(
      'GOOGLE_DOCUMENT_AI_PROCESSOR_ID',
    );

    if (!this.projectId || !this.processorId) {
      this.logger.warn(
        'Google Document AI not configured. Set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID in .env',
      );
      return;
    }

    this.isConfigured = true;
    this.logger.log('Google Document AI configured successfully');
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Parse an invoice image using Google Document AI
   */
  async parseInvoice(imageUrl: string): Promise<ParsedInvoiceData> {
    if (!this.isConfigured) {
      this.logger.warn('Document AI not configured, returning empty result');
      return { lineItems: [], confidence: 0 };
    }

    try {
      // Fetch the image from Firebase Storage URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType =
        imageResponse.headers.get('content-type') || 'image/jpeg';

      // Call Google Document AI API
      const result = await this.callDocumentAI(base64Image, mimeType);

      return result;
    } catch (error) {
      this.logger.error('Failed to parse invoice:', error);
      throw error;
    }
  }

  /**
   * Parse invoice from base64 image data
   */
  async parseInvoiceFromBase64(
    base64Data: string,
    mimeType: string,
  ): Promise<ParsedInvoiceData> {
    if (!this.isConfigured) {
      this.logger.warn('Document AI not configured, returning empty result');
      return { lineItems: [], confidence: 0 };
    }

    try {
      // Remove data URL prefix if present
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');

      const result = await this.callDocumentAI(base64Image, mimeType);
      return result;
    } catch (error) {
      this.logger.error('Failed to parse invoice from base64:', error);
      throw error;
    }
  }

  private async callDocumentAI(
    base64Image: string,
    mimeType: string,
  ): Promise<ParsedInvoiceData> {
    const apiKey = this.configService.get<string>('GOOGLE_CLOUD_API_KEY');

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

  private extractInvoiceData(apiResponse: any): ParsedInvoiceData {
    const document = apiResponse.document;

    if (!document) {
      return { lineItems: [], confidence: 0 };
    }

    const entities = document.entities || [];
    const parsed: ParsedInvoiceData = {
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

    // Calculate average confidence
    parsed.confidence =
      confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return parsed;
  }

  private parseLineItem(entity: any): InvoiceLineItem | null {
    const properties = entity.properties || [];
    const item: InvoiceLineItem = {
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

    // Calculate missing values
    if (item.totalPrice === 0 && item.unitPrice > 0) {
      item.totalPrice = item.unitPrice * item.quantity;
    }
    if (item.unitPrice === 0 && item.totalPrice > 0 && item.quantity > 0) {
      item.unitPrice = item.totalPrice / item.quantity;
    }

    return item.description ? item : null;
  }

  private parseDate(value: string, normalizedValue?: any): string {
    if (normalizedValue?.dateValue) {
      const { year, month, day } = normalizedValue.dateValue;
      if (year && month && day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Try to parse the date string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try Bulgarian date format DD.MM.YYYY
    const bgMatch = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (bgMatch) {
      const [, day, month, year] = bgMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return value;
  }

  private parseNumber(value: string, normalizedValue?: any): number {
    if (normalizedValue?.moneyValue?.units) {
      return (
        Number(normalizedValue.moneyValue.units) +
        (normalizedValue.moneyValue.nanos || 0) / 1e9
      );
    }

    // Clean the string and parse
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');

    return parseFloat(cleaned) || 0;
  }
}
