/**
 * Payload формат, изпращан от CortanaSoft WP плъгина (class-cortanasoft-order-handler.php).
 */
export interface WooCommerceOrderPayload {
  source: string;
  order: {
    externalId: number;
    orderNumber: string;
    status: string;
    currency: string;
    createdAt: string | null;
    customerNote: string;
    paymentMethod: string;
    paymentMethodTitle: string;
  };
  billing: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  totals: {
    subtotal: number;
    totalTax: number;
    shippingTotal: number;
    discountTotal: number;
    total: number;
  };
  items: WooCommerceOrderItem[];
}

export interface WooCommerceOrderItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  tax: number;
  total: number;
}
