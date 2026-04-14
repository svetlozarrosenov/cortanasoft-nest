export interface CreateLabelParams {
  orderNumber: string;
  receiverName: string;
  receiverPhone: string;
  receiverOfficeCode?: string;
  receiverAddress?: {
    city: { country: { code3: string }; name: string; postCode: string };
    street: string;
    num: string;
    other?: string;
  };
  weight: number;
  packCount?: number;
  dimensionsL?: number;
  dimensionsW?: number;
  dimensionsH?: number;
  description?: string;
  codAmount?: number;
  currency?: string;
}
