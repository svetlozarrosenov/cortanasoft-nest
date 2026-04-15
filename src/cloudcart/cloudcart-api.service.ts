import { Injectable, Logger } from '@nestjs/common';
import {
  CloudCartRequestOptions,
  CloudCartCategory,
  CloudCartProduct,
  CloudCartCustomer,
  CloudCartOrderRest,
  CloudCartStoreQuantity,
  CloudCartListResponse,
  CloudCartSingleResponse,
} from './interfaces';

@Injectable()
export class CloudCartApiService {
  private readonly logger = new Logger(CloudCartApiService.name);

  private buildUrl(
    domain: string,
    path: string,
    params?: Record<string, string>,
  ): string {
    const baseUrl = `https://${domain}/api/v2${path}`;
    if (!params) return baseUrl;
    const searchParams = new URLSearchParams(params);
    return `${baseUrl}?${searchParams.toString()}`;
  }

  private async request<T>(
    options: CloudCartRequestOptions,
    path: string,
    params?: Record<string, string>,
    init?: { method?: string; body?: string },
  ): Promise<T> {
    const url = this.buildUrl(options.domain, path, params);

    const response = await fetch(url, {
      method: init?.method || 'GET',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'X-CloudCart-ApiKey': options.apiKey,
      },
      body: init?.body,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `CloudCart API ${response.status}: ${path} — ${body.slice(0, 200)}`,
      );
      throw new Error(
        `CloudCart API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async testConnection(options: CloudCartRequestOptions): Promise<boolean> {
    try {
      await this.request<CloudCartListResponse<CloudCartCategory>>(
        options,
        '/categories',
        { 'page[size]': '1' },
      );
      return true;
    } catch {
      return false;
    }
  }

  async listCategories(
    options: CloudCartRequestOptions,
    page = 1,
    pageSize = 50,
  ): Promise<CloudCartListResponse<CloudCartCategory>> {
    return this.request(options, '/categories', {
      'page[number]': String(page),
      'page[size]': String(pageSize),
    });
  }

  async getAllCategories(
    options: CloudCartRequestOptions,
  ): Promise<CloudCartCategory[]> {
    const all: CloudCartCategory[] = [];
    let page = 1;

    while (true) {
      const res = await this.listCategories(options, page, 50);
      all.push(...res.data);

      if (page >= res.meta.page['last-page']) break;
      page++;
    }

    return all;
  }

  async listProducts(
    options: CloudCartRequestOptions,
    page = 1,
    pageSize = 50,
    include?: string,
  ): Promise<CloudCartListResponse<CloudCartProduct>> {
    const params: Record<string, string> = {
      'page[number]': String(page),
      'page[size]': String(pageSize),
    };
    if (include) params.include = include;

    return this.request(options, '/products', params);
  }

  async getAllProducts(options: CloudCartRequestOptions): Promise<{
    products: CloudCartProduct[];
    included: any[];
  }> {
    const products: CloudCartProduct[] = [];
    const included: any[] = [];
    let page = 1;

    while (true) {
      const res = await this.listProducts(
        options,
        page,
        50,
        'variant,image,category',
      );
      products.push(...res.data);
      if (res.included) included.push(...res.included);

      if (page >= res.meta.page['last-page']) break;
      page++;
    }

    return { products, included };
  }

  async getProduct(
    options: CloudCartRequestOptions,
    productId: string,
  ): Promise<CloudCartSingleResponse<CloudCartProduct>> {
    return this.request(options, `/products/${productId}`, {
      include: 'variant,image,category',
    });
  }

  async listStoreQuantities(
    options: CloudCartRequestOptions,
    page = 1,
    pageSize = 50,
  ): Promise<CloudCartListResponse<CloudCartStoreQuantity>> {
    return this.request(options, '/store-quantity', {
      'page[number]': String(page),
      'page[size]': String(pageSize),
    });
  }

  async getAllStoreQuantities(
    options: CloudCartRequestOptions,
  ): Promise<CloudCartStoreQuantity[]> {
    const all: CloudCartStoreQuantity[] = [];
    let page = 1;

    while (true) {
      const res = await this.listStoreQuantities(options, page, 50);
      all.push(...res.data);

      if (page >= res.meta.page['last-page']) break;
      page++;
    }

    return all;
  }

  /**
   * Търси продукт в CloudCart по SKU (SKU живее на variant-а).
   * Връща продукта с included variants.
   */
  async findProductBySku(
    options: CloudCartRequestOptions,
    sku: string,
  ): Promise<{ product: CloudCartProduct; included: any[] } | null> {
    try {
      const res = await this.request<CloudCartListResponse<CloudCartProduct>>(
        options,
        '/products',
        { 'filter[sku]': sku, 'page[size]': '1', include: 'variants' },
      );
      if (res.data.length === 0) return null;
      return { product: res.data[0], included: res.included || [] };
    } catch {
      return null;
    }
  }

  /**
   * Обновява продукт в CloudCart (PATCH /products/:id).
   * JSON:API формат. price_from/price_to са read-only — не ги пращаме тук.
   */
  async updateProduct(
    options: CloudCartRequestOptions,
    productId: string,
    attributes: Record<string, unknown>,
  ): Promise<CloudCartSingleResponse<CloudCartProduct>> {
    const body = JSON.stringify({
      data: {
        type: 'products',
        id: productId,
        attributes,
      },
    });

    return this.request(options, `/products/${productId}`, undefined, {
      method: 'PATCH',
      body,
    });
  }

  /**
   * Обновява variant в CloudCart (PATCH /variants/:id).
   * Цената е в центове (2999 = 29.99 лв).
   */
  async updateVariant(
    options: CloudCartRequestOptions,
    variantId: string,
    attributes: Record<string, unknown>,
  ): Promise<any> {
    const body = JSON.stringify({
      data: {
        type: 'variants',
        id: variantId,
        attributes,
      },
    });

    return this.request(options, `/variants/${variantId}`, undefined, {
      method: 'PATCH',
      body,
    });
  }

  // ==================== Customers ====================

  async listCustomers(
    options: CloudCartRequestOptions,
    page = 1,
    pageSize = 50,
  ): Promise<CloudCartListResponse<CloudCartCustomer>> {
    return this.request(options, '/customers', {
      'page[number]': String(page),
      'page[size]': String(pageSize),
    });
  }

  async getAllCustomers(
    options: CloudCartRequestOptions,
  ): Promise<CloudCartCustomer[]> {
    const all: CloudCartCustomer[] = [];
    let page = 1;

    while (true) {
      const res = await this.listCustomers(options, page, 50);
      all.push(...res.data);
      if (page >= res.meta.page['last-page']) break;
      page++;
    }

    return all;
  }

  // ==================== Orders ====================

  async listOrders(
    options: CloudCartRequestOptions,
    page = 1,
    pageSize = 50,
  ): Promise<CloudCartListResponse<CloudCartOrderRest>> {
    return this.request(options, '/orders', {
      'page[number]': String(page),
      'page[size]': String(pageSize),
      sort: '-date_added',
      include: 'products,payment,shipping-address,billing-address',
    });
  }

  async getAllOrders(options: CloudCartRequestOptions): Promise<{
    orders: CloudCartOrderRest[];
    included: any[];
  }> {
    const orders: CloudCartOrderRest[] = [];
    const included: any[] = [];
    let page = 1;

    while (true) {
      const res = await this.listOrders(options, page, 50);
      orders.push(...res.data);
      if (res.included) included.push(...res.included);
      if (page >= res.meta.page['last-page']) break;
      page++;
    }

    return { orders, included };
  }
}
