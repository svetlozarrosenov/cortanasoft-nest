export interface CloudCartOrderRest {
  type: 'orders';
  id: string;
  attributes: {
    status: string;
    status_fulfillment: string;
    customer_id: number | null;
    customer_email: string;
    customer_first_name: string;
    customer_last_name: string;
    order_total: number;
    order_subtotal: number;
    price_products_subtotal: number;
    currency: string;
    note_customer: string | null;
    note: string | null;
    date_added: string;
    updated_at: string;
  };
  relationships?: Record<string, any>;
}

export interface CloudCartOrderLineItem {
  type: 'order-products';
  id: string;
  attributes: {
    name: string;
    model: string;
    sku: string | null;
    quantity: number;
    price: number;
    total: number;
    product_id: number;
  };
}

export interface CloudCartOrderPayment {
  type: 'order-payments';
  id: string;
  attributes: {
    method: string;
    amount: number;
    currency: string;
  };
}

export interface CloudCartOrderAddress {
  type: 'order-addresses';
  id: string;
  attributes: {
    first_name: string;
    last_name: string;
    company: string | null;
    phone: string | null;
    address_1: string | null;
    address_2: string | null;
    city: string | null;
    postcode: string | null;
    country: string | null;
  };
}
