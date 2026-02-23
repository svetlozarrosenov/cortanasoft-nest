import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(user: any, dto: CreateProductDto): Promise<{
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
        vatRate: import("@prisma/client/runtime/library").Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
    findAll(user: any, query: QueryProductsDto): Promise<{
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
            vatRate: import("@prisma/client/runtime/library").Decimal;
            createdById: string | null;
            sku: string;
            barcode: string | null;
            unit: import(".prisma/client").$Enums.Unit;
            purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
            salePrice: import("@prisma/client/runtime/library").Decimal;
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
    findAllCategories(user: any): Promise<({
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
    createCategory(user: any, data: {
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
    updateCategory(user: any, id: string, data: {
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
    removeCategory(user: any, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
    }>;
    findOne(user: any, id: string): Promise<{
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
        vatRate: import("@prisma/client/runtime/library").Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
    update(user: any, id: string, dto: UpdateProductDto): Promise<{
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
        vatRate: import("@prisma/client/runtime/library").Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
    remove(user: any, id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ProductType;
        description: string | null;
        companyId: string;
        vatRate: import("@prisma/client/runtime/library").Decimal;
        createdById: string | null;
        sku: string;
        barcode: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal | null;
        trackInventory: boolean;
        purchaseCurrencyId: string | null;
        purchaseExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        saleCurrencyId: string | null;
        saleExchangeRate: import("@prisma/client/runtime/library").Decimal | null;
        categoryId: string | null;
    }>;
}
