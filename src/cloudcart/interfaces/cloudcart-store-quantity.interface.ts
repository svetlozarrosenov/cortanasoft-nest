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
