import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
export declare class CompanyProductsController {
    private readonly productsService;
    private readonly exportService;
    constructor(productsService: ProductsService, exportService: ExportService);
    create(companyId: string, user: any, dto: CreateProductDto): Promise<{
        category: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        purchaseCurrency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
        saleCurrency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
    } & {
        name: string;
        type: import(".prisma/client").$Enums.ProductType;
        createdAt: Date;
        sku: string;
        description: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        createdById: string | null;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        vatRate: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
    findAll(companyId: string, query: QueryProductsDto): Promise<{
        data: ({
            category: {
                name: string;
                createdAt: Date;
                description: string | null;
                updatedAt: Date;
                id: string;
                companyId: string;
                parentId: string | null;
            } | null;
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            purchaseCurrency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            saleCurrency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
        } & {
            name: string;
            type: import(".prisma/client").$Enums.ProductType;
            createdAt: Date;
            sku: string;
            description: string | null;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            companyId: string;
            createdById: string | null;
            barcode: string | null;
            unit: import(".prisma/client").$Enums.Unit;
            purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
            salePrice: import("@prisma/client/runtime/library").Decimal;
            vatRate: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal | null;
            trackInventory: boolean;
            purchaseCurrencyId: string | null;
            purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
            saleCurrencyId: string | null;
            saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
            categoryId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    export(companyId: string, query: QueryProductsDto, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    findAllCategories(companyId: string): Promise<({
        _count: {
            products: number;
        };
        parent: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        name: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        id: string;
        companyId: string;
        parentId: string | null;
    })[]>;
    createCategory(companyId: string, data: {
        name: string;
        description?: string;
        parentId?: string;
    }): Promise<{
        parent: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        name: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        id: string;
        companyId: string;
        parentId: string | null;
    }>;
    updateCategory(companyId: string, id: string, data: {
        name?: string;
        description?: string;
        parentId?: string;
    }): Promise<{
        parent: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        name: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        id: string;
        companyId: string;
        parentId: string | null;
    }>;
    removeCategory(companyId: string, id: string): Promise<{
        name: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        id: string;
        companyId: string;
        parentId: string | null;
    }>;
    findOne(companyId: string, id: string): Promise<{
        category: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        purchaseCurrency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
        saleCurrency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
    } & {
        name: string;
        type: import(".prisma/client").$Enums.ProductType;
        createdAt: Date;
        sku: string;
        description: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        createdById: string | null;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        vatRate: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateProductDto): Promise<{
        category: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            parentId: string | null;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        purchaseCurrency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
        saleCurrency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
    } & {
        name: string;
        type: import(".prisma/client").$Enums.ProductType;
        createdAt: Date;
        sku: string;
        description: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        createdById: string | null;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        vatRate: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        name: string;
        type: import(".prisma/client").$Enums.ProductType;
        createdAt: Date;
        sku: string;
        description: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        createdById: string | null;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        vatRate: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
}
