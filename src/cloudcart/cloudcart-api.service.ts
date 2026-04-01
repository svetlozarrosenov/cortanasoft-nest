import { Injectable, Logger } from '@nestjs/common';

export interface CloudCartRequestOptions {
  domain: string;
  apiKey: string;
}

export interface CloudCartPaginationMeta {
  'current-page': number;
  'per-page': number;
  from: number;
  to: number;
  total: number;
  'last-page': number;
}

export interface CloudCartProduct {
  type: 'products';
  id: string;
  attributes: {
    url_handle: string;
    name: string;
    description: string | null;
    short_description: string | null;
    seo_title: string | null;
    seo_description: string | null;
    category_id: number | null;
    vendor_id: number | null;
    image_id: number | null;
    price_from: number | null;
    price_to: number | null;
    active: string;
    draft: string;
    tracking: string;
    shipping: string;
    digital: string;
    sale: string;
    new: string;
    featured: number;
    continue_selling: string;
    product_type: string;
    date_added: string;
    date_modified: string;
    default_variant_id: number | null;
    p1: string | null;
    p2: string | null;
    p3: string | null;
  };
  relationships?: Record<string, any>;
}

export interface CloudCartCategory {
  type: 'categories';
  id: string;
  attributes: {
    name: string;
    order: number;
    description: string | null;
    parent_id: number | null;
    seo_title: string | null;
    seo_description: string | null;
    url_handle: string;
    date_modified: string;
    image: string | null;
    image_url: string | null;
  };
}

export interface CloudCartVariant {
  type: 'variants';
  id: string;
  attributes: {
    sku: string | null;
    barcode: string | null;
    price: number;
    price_compare: number | null;
    weight: number | null;
    option1_id: number | null;
    option2_id: number | null;
    option3_id: number | null;
    active: string;
    position: number;
    image_id: number | null;
  };
}

export interface CloudCartStoreQuantity {
  type: 'store-quantity';
  id: string;
  attributes: {
    shop_id: number;
    qty: number;
    product_id: number;
    variant_id: number;
  };
}

export interface CloudCartImage {
  type: 'images';
  id: string;
  attributes: {
    position: number;
    thumbs: Record<string, string>;
  };
}

export interface CloudCartListResponse<T> {
  meta: { page: CloudCartPaginationMeta };
  links: { first?: string; next?: string; last?: string };
  data: T[];
  included?: any[];
}

export interface CloudCartSingleResponse<T> {
  data: T;
  included?: any[];
}

@Injectable()
export class CloudCartApiService {
  private readonly logger = new Logger(CloudCartApiService.name);

  private buildUrl(domain: string, path: string, params?: Record<string, string>): string {
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
      this.logger.warn(`CloudCart API ${response.status}: ${path} — ${body.slice(0, 200)}`);
      throw new Error(`CloudCart API error: ${response.status} ${response.statusText}`);
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

  async getAllCategories(options: CloudCartRequestOptions): Promise<CloudCartCategory[]> {
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
      const res = await this.listProducts(options, page, 50, 'variant,image,category');
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

  async getAllStoreQuantities(options: CloudCartRequestOptions): Promise<CloudCartStoreQuantity[]> {
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
   * Търси продукт в CloudCart по SKU.
   * Връща първия намерен или null.
   */
  async findProductBySku(
    options: CloudCartRequestOptions,
    sku: string,
  ): Promise<CloudCartProduct | null> {
    try {
      const res = await this.request<CloudCartListResponse<CloudCartProduct>>(
        options,
        '/products',
        { 'filter[sku]': sku, 'page[size]': '1' },
      );
      return res.data.length > 0 ? res.data[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Обновява продукт в CloudCart (PATCH /products/:id).
   * JSON:API формат.
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

    return this.request(
      options,
      `/products/${productId}`,
      undefined,
      { method: 'PATCH', body },
    );
  }
}
