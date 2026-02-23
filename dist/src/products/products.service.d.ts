import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
import { Prisma } from '@prisma/client';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, userId: string, dto: CreateProductDto): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        purchaseCurrency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        saleCurrency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        category: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ProductType;
        description: string | null;
        companyId: string;
        vatRate: Prisma.Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: Prisma.Decimal | null;
        salePrice: Prisma.Decimal;
        minStock: Prisma.Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: Prisma.Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: Prisma.Decimal | null;
        categoryId: string | null;
    }>;
    findAll(companyId: string, query: QueryProductsDto): Promise<{
        data: ({
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            purchaseCurrency: {
                symbol: string;
                id: string;
                code: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            saleCurrency: {
                symbol: string;
                id: string;
                code: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            category: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                companyId: string;
                parentId: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ProductType;
            description: string | null;
            companyId: string;
            vatRate: Prisma.Decimal;
            createdById: string | null;
            sku: string;
            barcode: string | null;
            unit: import(".prisma/client").$Enums.Unit;
            purchasePrice: Prisma.Decimal | null;
            salePrice: Prisma.Decimal;
            minStock: Prisma.Decimal | null;
            trackInventory: boolean;
            purchaseCurrencyId: string | null;
            purchaseExchangeRate: Prisma.Decimal | null;
            saleCurrencyId: string | null;
            saleExchangeRate: Prisma.Decimal | null;
            categoryId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        purchaseCurrency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        saleCurrency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        category: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ProductType;
        description: string | null;
        companyId: string;
        vatRate: Prisma.Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: Prisma.Decimal | null;
        salePrice: Prisma.Decimal;
        minStock: Prisma.Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: Prisma.Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: Prisma.Decimal | null;
        categoryId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateProductDto): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        purchaseCurrency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        saleCurrency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        category: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ProductType;
        description: string | null;
        companyId: string;
        vatRate: Prisma.Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: Prisma.Decimal | null;
        salePrice: Prisma.Decimal;
        minStock: Prisma.Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: Prisma.Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: Prisma.Decimal | null;
        categoryId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ProductType;
        description: string | null;
        companyId: string;
        vatRate: Prisma.Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: Prisma.Decimal | null;
        salePrice: Prisma.Decimal;
        minStock: Prisma.Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: Prisma.Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: Prisma.Decimal | null;
        categoryId: string | null;
    }>;
    findAllCategories(companyId: string): Promise<({
        _count: {
            products: number;
        };
        parent: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
    })[]>;
    createCategory(companyId: string, data: {
        name: string;
        description?: string;
        parentId?: string;
    }): Promise<{
        parent: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
    }>;
    updateCategory(companyId: string, id: string, data: {
        name?: string;
        description?: string;
        parentId?: string;
    }): Promise<{
        parent: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
    }>;
    removeCategory(companyId: string, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
    }>;
}
