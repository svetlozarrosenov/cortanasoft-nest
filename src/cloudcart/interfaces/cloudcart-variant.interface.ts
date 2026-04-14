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
