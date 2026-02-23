export interface ExportColumn {
    header: string;
    key: string;
    width?: number;
}
export type ExportFormat = 'csv' | 'xlsx';
export declare class ExportService {
    generateFile(columns: ExportColumn[], data: any[], format: ExportFormat, sheetName?: string): Promise<Buffer>;
    private resolveValue;
}
