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
