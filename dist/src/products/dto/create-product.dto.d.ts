import { Unit, ProductType } from '@prisma/client';
export declare class CreateProductDto {
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    type?: ProductType;
    unit?: Unit;
    purchasePrice?: number;
    salePrice: number;
    vatRate?: number;
    minStock?: number;
    trackInventory?: boolean;
    isActive?: boolean;
    categoryId?: string;
    purchaseCurrencyId?: string;
    purchaseExchangeRate?: number;
    saleCurrencyId?: string;
    saleExchangeRate?: number;
}
