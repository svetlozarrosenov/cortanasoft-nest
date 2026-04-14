export interface CloudCartOrderPayload {
  id: number;
  status: string;
  status_fulfillment: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  order_total: number;
  order_subtotal: number;
  price_products_subtotal: number;
  quantity: number;
  weight: number;
  vat_included: string;
  note_customer: string;
  note_administrator: string;
  invoice_number: string;
  invoice_date: string;
  date_added: string;
  date_archived: string;
  email_sent: string;
  billing_address: CloudCartAddress;
  shipping_address: CloudCartAddress;
  products: CloudCartOrderProduct[];
  payments: CloudCartPayment[];
  shipping: CloudCartShipping;
  discounts: CloudCartDiscount[];
  taxes: CloudCartTax[];
}

export interface CloudCartAddress {
  first_name: string;
  last_name: string;
  city: string;
  street: string;
  postal_code: string;
  country: string;
  phone: string;
  company: string;
  company_name: string;
  company_vat: string;
  formatted: string;
  note_customer: string;
  note_administrator: string;
}

export interface CloudCartOrderProduct {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  quantity: number;
  price: number;
  order_price: number;
  weight: number;
  sale: string;
  tracked: string;
  digital: string;
  category_name: string;
  vendor_name: string;
  p1: string;
  p2: string;
  p3: string;
  v1: string;
  v2: string;
  v3: string;
}

export interface CloudCartPayment {
  id: number;
  provider: string;
  status: string;
  amount: number;
  date_added: string;
  date_last_update: string;
}

export interface CloudCartShipping {
  id: number;
  provider_name: string;
  provider_amount: number;
  provider_insurance: number;
  tracking_number: string;
  tracking_url: string;
  order_insurance: string;
  order_has_insurance: string;
  date_expedition: string;
  date_delivery: string;
  updated_at: string;
}

export interface CloudCartDiscount {
  id: number;
  name: string;
  code: string;
  type: string;
  type_value: number;
  order_over: number;
}

export interface CloudCartTax {
  id: number;
  tax_name: string;
  tax: number;
  tax_type: string;
  tax_shipping: string;
  tax_vat: string;
  order_amount: number;
}
