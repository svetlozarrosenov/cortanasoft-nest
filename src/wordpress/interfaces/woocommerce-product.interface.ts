export interface WooCommerceProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  regular_price: string;
  price: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  status: string;
}
