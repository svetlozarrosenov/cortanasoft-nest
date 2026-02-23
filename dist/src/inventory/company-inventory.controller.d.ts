import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { InventoryService } from './inventory.service';
import { QueryInventoryDto, QueryStockLevelsDto, UpdateInventoryBatchDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
export declare class CompanyInventoryController {
    private readonly inventoryService;
    private readonly exportService;
    constructor(inventoryService: InventoryService, exportService: ExportService);
    findAll(companyId: string, query: QueryInventoryDto): Promise<{
        data: ({
            product: {
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                id: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
                code: string;
                id: string;
            };
            storageZone: {
                name: string;
                code: string;
                id: string;
            } | null;
            goodsReceiptItem: {
                quantity: import("@prisma/client/runtime/library").Decimal;
                id: string;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                goodsReceipt: {
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    supplier: {
                        name: string;
                        id: string;
                    } | null;
                    id: string;
                    receiptDate: Date;
                };
            } | null;
        } & {
            createdAt: Date;
            quantity: import("@prisma/client/runtime/library").Decimal;
            updatedAt: Date;
            id: string;
            companyId: string;
            notes: string | null;
            productId: string;
            locationId: string;
            batchNumber: string;
            initialQty: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            expiryDate: Date | null;
            manufacturingDate: Date | null;
            storageZoneId: string | null;
            goodsReceiptItemId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getStockLevels(companyId: string, query: QueryStockLevelsDto): Promise<{
        data: {
            productId: string;
            product: {
                id: string;
                sku: string;
                name: string;
                unit: import(".prisma/client").$Enums.Unit;
                minStock: import("@prisma/client/runtime/library").Decimal | null;
                type: import(".prisma/client").$Enums.ProductType;
                category: {
                    name: string;
                    id: string;
                } | null;
            };
            totalQuantity: number;
            minStock: number | null;
            isBelowMinStock: boolean;
            locationBreakdown: {
                location: any;
                quantity: number;
            }[];
            batchCount: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getByLocation(companyId: string, locationId: string, query: QueryInventoryDto): Promise<{
        data: ({
            product: {
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                id: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
                code: string;
                id: string;
            };
            storageZone: {
                name: string;
                code: string;
                id: string;
            } | null;
            goodsReceiptItem: {
                quantity: import("@prisma/client/runtime/library").Decimal;
                id: string;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                goodsReceipt: {
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    supplier: {
                        name: string;
                        id: string;
                    } | null;
                    id: string;
                    receiptDate: Date;
                };
            } | null;
        } & {
            createdAt: Date;
            quantity: import("@prisma/client/runtime/library").Decimal;
            updatedAt: Date;
            id: string;
            companyId: string;
            notes: string | null;
            productId: string;
            locationId: string;
            batchNumber: string;
            initialQty: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            expiryDate: Date | null;
            manufacturingDate: Date | null;
            storageZoneId: string | null;
            goodsReceiptItemId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getByProduct(companyId: string, productId: string, query: QueryInventoryDto): Promise<{
        data: ({
            product: {
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                id: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
                code: string;
                id: string;
            };
            storageZone: {
                name: string;
                code: string;
                id: string;
            } | null;
            goodsReceiptItem: {
                quantity: import("@prisma/client/runtime/library").Decimal;
                id: string;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                goodsReceipt: {
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    supplier: {
                        name: string;
                        id: string;
                    } | null;
                    id: string;
                    receiptDate: Date;
                };
            } | null;
        } & {
            createdAt: Date;
            quantity: import("@prisma/client/runtime/library").Decimal;
            updatedAt: Date;
            id: string;
            companyId: string;
            notes: string | null;
            productId: string;
            locationId: string;
            batchNumber: string;
            initialQty: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            expiryDate: Date | null;
            manufacturingDate: Date | null;
            storageZoneId: string | null;
            goodsReceiptItemId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getByGoodsReceipt(companyId: string, goodsReceiptId: string): Promise<{
        data: ({
            product: {
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                id: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
                code: string;
                id: string;
            };
            storageZone: {
                name: string;
                code: string;
                id: string;
            } | null;
            goodsReceiptItem: {
                quantity: import("@prisma/client/runtime/library").Decimal;
                id: string;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                goodsReceipt: {
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    supplier: {
                        name: string;
                        id: string;
                    } | null;
                    id: string;
                    receiptDate: Date;
                };
            } | null;
        } & {
            createdAt: Date;
            quantity: import("@prisma/client/runtime/library").Decimal;
            updatedAt: Date;
            id: string;
            companyId: string;
            notes: string | null;
            productId: string;
            locationId: string;
            batchNumber: string;
            initialQty: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
            expiryDate: Date | null;
            manufacturingDate: Date | null;
            storageZoneId: string | null;
            goodsReceiptItemId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    export(companyId: string, query: QueryInventoryDto, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    findOne(companyId: string, id: string): Promise<{
        product: {
            name: string;
            type: import(".prisma/client").$Enums.ProductType;
            sku: string;
            category: {
                name: string;
                id: string;
            } | null;
            id: string;
            unit: import(".prisma/client").$Enums.Unit;
        };
        location: {
            name: string;
            type: import(".prisma/client").$Enums.LocationType;
            code: string;
            id: string;
        };
        storageZone: {
            name: string;
            code: string;
            id: string;
        } | null;
        goodsReceiptItem: {
            quantity: import("@prisma/client/runtime/library").Decimal;
            id: string;
            vatRate: import("@prisma/client/runtime/library").Decimal;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            goodsReceipt: {
                status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                receiptNumber: string;
                supplier: {
                    name: string;
                    eik: string | null;
                    id: string;
                } | null;
                invoiceNumber: string | null;
                id: string;
                invoiceDate: Date | null;
                receiptDate: Date;
            };
        } | null;
    } & {
        createdAt: Date;
        quantity: import("@prisma/client/runtime/library").Decimal;
        updatedAt: Date;
        id: string;
        companyId: string;
        notes: string | null;
        productId: string;
        locationId: string;
        batchNumber: string;
        initialQty: import("@prisma/client/runtime/library").Decimal;
        unitCost: import("@prisma/client/runtime/library").Decimal;
        expiryDate: Date | null;
        manufacturingDate: Date | null;
        storageZoneId: string | null;
        goodsReceiptItemId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateInventoryBatchDto): Promise<{
        product: {
            name: string;
            sku: string;
            id: string;
            unit: import(".prisma/client").$Enums.Unit;
        };
        location: {
            name: string;
            code: string;
            id: string;
        };
        storageZone: {
            name: string;
            code: string;
            id: string;
        } | null;
    } & {
        createdAt: Date;
        quantity: import("@prisma/client/runtime/library").Decimal;
        updatedAt: Date;
        id: string;
        companyId: string;
        notes: string | null;
        productId: string;
        locationId: string;
        batchNumber: string;
        initialQty: import("@prisma/client/runtime/library").Decimal;
        unitCost: import("@prisma/client/runtime/library").Decimal;
        expiryDate: Date | null;
        manufacturingDate: Date | null;
        storageZoneId: string | null;
        goodsReceiptItemId: string | null;
    }>;
}
