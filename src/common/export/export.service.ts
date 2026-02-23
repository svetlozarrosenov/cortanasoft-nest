import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export type ExportFormat = 'csv' | 'xlsx';

@Injectable()
export class ExportService {
  async generateFile(
    columns: ExportColumn[],
    data: any[],
    format: ExportFormat,
    sheetName = 'Data',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    for (const item of data) {
      const row: Record<string, any> = {};
      for (const col of columns) {
        row[col.key] = this.resolveValue(item, col.key);
      }
      worksheet.addRow(row);
    }

    if (format === 'csv') {
      return Buffer.from(await workbook.csv.writeBuffer());
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private resolveValue(obj: any, path: string): any {
    const val = path.split('.').reduce((acc, part) => acc?.[part], obj);
    if (val === null || val === undefined) return '';
    if (typeof val === 'object' && typeof val.toNumber === 'function') {
      return val.toNumber();
    }
    if (val instanceof Date) {
      return val.toISOString().slice(0, 19).replace('T', ' ');
    }
    return val;
  }
}
