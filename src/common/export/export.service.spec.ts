import { ExportService } from './export.service';
import * as ExcelJS from 'exceljs';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    service = new ExportService();
  });

  const columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Age', key: 'age', width: 10 },
  ];

  const data = [
    { name: 'John Doe', email: 'john@example.com', age: 30 },
    { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  ];

  describe('generateFile - xlsx', () => {
    it('should generate a valid xlsx buffer', async () => {
      const buffer = await service.generateFile(columns, data, 'xlsx', 'TestSheet');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should contain correct data in xlsx', async () => {
      const buffer = await service.generateFile(columns, data, 'xlsx', 'TestSheet');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('TestSheet');
      expect(worksheet).toBeDefined();

      // Header row
      expect(worksheet!.getRow(1).getCell(1).value).toBe('Name');
      expect(worksheet!.getRow(1).getCell(2).value).toBe('Email');
      expect(worksheet!.getRow(1).getCell(3).value).toBe('Age');

      // Data rows
      expect(worksheet!.getRow(2).getCell(1).value).toBe('John Doe');
      expect(worksheet!.getRow(2).getCell(2).value).toBe('john@example.com');
      expect(worksheet!.getRow(2).getCell(3).value).toBe(30);

      expect(worksheet!.getRow(3).getCell(1).value).toBe('Jane Smith');
    });

    it('should style header row with bold and blue background', async () => {
      const buffer = await service.generateFile(columns, data, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      const headerRow = worksheet.getRow(1);

      expect(headerRow.font).toEqual(
        expect.objectContaining({ bold: true }),
      );
      expect(headerRow.fill).toEqual(
        expect.objectContaining({
          type: 'pattern',
          pattern: 'solid',
        }),
      );
    });
  });

  describe('generateFile - csv', () => {
    it('should generate a valid csv buffer', async () => {
      const buffer = await service.generateFile(columns, data, 'csv');
      expect(buffer).toBeInstanceOf(Buffer);
      const content = buffer.toString('utf-8');
      expect(content).toContain('Name');
      expect(content).toContain('John Doe');
      expect(content).toContain('jane@example.com');
    });
  });

  describe('dot-notation resolution', () => {
    it('should resolve nested object values', async () => {
      const nestedColumns = [
        { header: 'Customer', key: 'customer.name', width: 20 },
        { header: 'City', key: 'address.city', width: 15 },
      ];
      const nestedData = [
        { customer: { name: 'Acme Corp' }, address: { city: 'Sofia' } },
        { customer: { name: 'Test Inc' }, address: { city: 'Plovdiv' } },
      ];

      const buffer = await service.generateFile(nestedColumns, nestedData, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      expect(ws.getRow(2).getCell(1).value).toBe('Acme Corp');
      expect(ws.getRow(2).getCell(2).value).toBe('Sofia');
      expect(ws.getRow(3).getCell(1).value).toBe('Test Inc');
    });

    it('should return empty string for missing nested values', async () => {
      const cols = [{ header: 'Missing', key: 'a.b.c', width: 10 }];
      const items = [{ a: { b: null } }, { x: 1 }];

      const buffer = await service.generateFile(cols, items, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      expect(ws.getRow(2).getCell(1).value).toBe('');
      expect(ws.getRow(3).getCell(1).value).toBe('');
    });
  });

  describe('Decimal handling', () => {
    it('should convert Prisma Decimal objects using toNumber()', async () => {
      const cols = [{ header: 'Price', key: 'price', width: 10 }];
      const items = [
        { price: { toNumber: () => 19.99 } },
        { price: { toNumber: () => 100 } },
      ];

      const buffer = await service.generateFile(cols, items, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      expect(ws.getRow(2).getCell(1).value).toBe(19.99);
      expect(ws.getRow(3).getCell(1).value).toBe(100);
    });
  });

  describe('Date handling', () => {
    it('should format Date objects as ISO strings', async () => {
      const cols = [{ header: 'Created', key: 'createdAt', width: 20 }];
      const items = [{ createdAt: new Date('2024-06-15T10:30:00Z') }];

      const buffer = await service.generateFile(cols, items, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      expect(ws.getRow(2).getCell(1).value).toBe('2024-06-15 10:30:00');
    });
  });

  describe('empty data', () => {
    it('should generate file with only headers when data is empty', async () => {
      const buffer = await service.generateFile(columns, [], 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      expect(ws.getRow(1).getCell(1).value).toBe('Name');
      expect(ws.rowCount).toBe(1);
    });
  });

  describe('default sheet name', () => {
    it('should use "Data" as default sheet name', async () => {
      const buffer = await service.generateFile(columns, data, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      expect(workbook.getWorksheet('Data')).toBeDefined();
    });
  });

  describe('column width defaults', () => {
    it('should use width 20 when not specified', async () => {
      const cols = [{ header: 'Test', key: 'test' }];
      const items = [{ test: 'value' }];

      const buffer = await service.generateFile(cols, items, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const ws = workbook.worksheets[0];

      expect(ws.getColumn(1).width).toBe(20);
    });
  });
});
