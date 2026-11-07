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
  // Обявена стойност (застраховка); ако липсва → сумата за НП
  declaredValueAmount?: number;
  // Опис на стоките (Еконт го иска при НП по споразумение „по департамент")
  packingList?: Array<{
    inventoryNum?: string;
    description: string;
    count: number;
    price?: number;
    weight?: number;
  }>;
  // „Номер на фактура (до 11 цифри) и дата (31.12.21)" за продажба по департамент
  invoiceNum?: string;
}
