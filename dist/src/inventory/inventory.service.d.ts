import { PrismaService } from '../prisma/prisma.service';
import { QueryInventoryDto, QueryStockLevelsDto, UpdateInventoryBatchDto } from './dto';
import { Prisma } from '@prisma/client';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(companyId: string, query: QueryInventoryDto): Promise<{
        data: ({
            product: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                id: string;
                code: string;
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
            };
            storageZone: {
                id: string;
                code: string;
                name: string;
            } | null;
            goodsReceiptItem: {
                id: string;
                goodsReceipt: {
                    id: string;
                    supplier: {
                        id: string;
                        name: string;
                    } | null;
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    receiptDate: Date;
                };
                quantity: Prisma.Decimal;
                unitPrice: Prisma.Decimal;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            quantity: Prisma.Decimal;
            productId: string;
            notes: string | null;
            locationId: string;
            batchNumber: string;
            initialQty: Prisma.Decimal;
            unitCost: Prisma.Decimal;
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
    findOne(companyId: string, id: string): Promise<{
        product: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.ProductType;
            sku: string;
            unit: import(".prisma/client").$Enums.Unit;
            category: {
                id: string;
                name: string;
            } | null;
        };
        location: {
            id: string;
            code: string;
            name: string;
            type: import(".prisma/client").$Enums.LocationType;
        };
        storageZone: {
            id: string;
            code: string;
            name: string;
        } | null;
        goodsReceiptItem: {
            id: string;
            goodsReceipt: {
                id: string;
                supplier: {
                    id: string;
                    name: string;
                    eik: string | null;
                } | null;
                status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                invoiceNumber: string | null;
                invoiceDate: Date | null;
                receiptNumber: string;
                receiptDate: Date;
            };
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            vatRate: Prisma.Decimal;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        quantity: Prisma.Decimal;
        productId: string;
        notes: string | null;
        locationId: string;
        batchNumber: string;
        initialQty: Prisma.Decimal;
        unitCost: Prisma.Decimal;
        expiryDate: Date | null;
        manufacturingDate: Date | null;
        storageZoneId: string | null;
        goodsReceiptItemId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateInventoryBatchDto): Promise<{
        product: {
            id: string;
            name: string;
            sku: string;
            unit: import(".prisma/client").$Enums.Unit;
        };
        location: {
            id: string;
            code: string;
            name: string;
        };
        storageZone: {
            id: string;
            code: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        quantity: Prisma.Decimal;
        productId: string;
        notes: string | null;
        locationId: string;
        batchNumber: string;
        initialQty: Prisma.Decimal;
        unitCost: Prisma.Decimal;
        expiryDate: Date | null;
        manufacturingDate: Date | null;
        storageZoneId: string | null;
        goodsReceiptItemId: string | null;
    }>;
    getStockLevels(companyId: string, query: QueryStockLevelsDto): Promise<{
        data: {
            productId: string;
            product: {
                id: string;
                sku: string;
                name: string;
                unit: import(".prisma/client").$Enums.Unit;
                minStock: Prisma.Decimal | null;
                type: import(".prisma/client").$Enums.ProductType;
                category: {
                    id: string;
                    name: string;
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
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                id: string;
                code: string;
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
            };
            storageZone: {
                id: string;
                code: string;
                name: string;
            } | null;
            goodsReceiptItem: {
                id: string;
                goodsReceipt: {
                    id: string;
                    supplier: {
                        id: string;
                        name: string;
                    } | null;
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    receiptDate: Date;
                };
                quantity: Prisma.Decimal;
                unitPrice: Prisma.Decimal;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            quantity: Prisma.Decimal;
            productId: string;
            notes: string | null;
            locationId: string;
            batchNumber: string;
            initialQty: Prisma.Decimal;
            unitCost: Prisma.Decimal;
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
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                id: string;
                code: string;
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
            };
            storageZone: {
                id: string;
                code: string;
                name: string;
            } | null;
            goodsReceiptItem: {
                id: string;
                goodsReceipt: {
                    id: string;
                    supplier: {
                        id: string;
                        name: string;
                    } | null;
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    receiptDate: Date;
                };
                quantity: Prisma.Decimal;
                unitPrice: Prisma.Decimal;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            quantity: Prisma.Decimal;
            productId: string;
            notes: string | null;
            locationId: string;
            batchNumber: string;
            initialQty: Prisma.Decimal;
            unitCost: Prisma.Decimal;
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
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.ProductType;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            };
            location: {
                id: string;
                code: string;
                name: string;
                type: import(".prisma/client").$Enums.LocationType;
            };
            storageZone: {
                id: string;
                code: string;
                name: string;
            } | null;
            goodsReceiptItem: {
                id: string;
                goodsReceipt: {
                    id: string;
                    supplier: {
                        id: string;
                        name: string;
                    } | null;
                    status: import(".prisma/client").$Enums.GoodsReceiptStatus;
                    receiptNumber: string;
                    receiptDate: Date;
                };
                quantity: Prisma.Decimal;
                unitPrice: Prisma.Decimal;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            quantity: Prisma.Decimal;
            productId: string;
            notes: string | null;
            locationId: string;
            batchNumber: string;
            initialQty: Prisma.Decimal;
            unitCost: Prisma.Decimal;
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
}
