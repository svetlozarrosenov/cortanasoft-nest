import { BadRequestException } from '@nestjs/common';

/** One sold product, priced as on an order line (unit price without VAT). */
export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  unit?: string;
  /** The exact unit sold, for a product kept by serial number. */
  inventorySerialId?: string;
  serialNumber?: string;
}

/** One line as the cash register prints it (unit price with VAT). */
export interface ReceiptLine {
  name: string;
  /** A…H, as the fiscal module names its VAT groups */
  vatGroup: string;
  unitPrice: string;
  quantity: string;
  unit?: string;
  /** Printed under the line as plain text, e.g. the serial number. */
  note?: string;
}

// How Bulgarian fiscal devices are programmed: А = 0%, Б = 20%, Г = 9%
// (В is 20% for fuels and is not used here).
const VAT_GROUPS: Record<number, string> = { 0: 'A', 20: 'B', 9: 'D' };

/** The register's VAT group for a rate, or null when it has none. */
export const vatGroupFor = (vatRate: number): string | null =>
  VAT_GROUPS[vatRate] ?? null;

const cents = (amount: number) => Math.round(amount * 100);

/** Line total with VAT in cents, computed exactly as an order line is. */
export function lineGrossCents(item: SaleItem): number {
  const net = cents(item.quantity * item.unitPrice);
  return net + Math.round((net * item.vatRate) / 100);
}

/**
 * Turns sold items into receipt lines whose total equals, to the cent, the
 * total the order will have.
 *
 * Orders keep prices without VAT and add VAT per line; a fiscal receipt takes
 * a unit price with VAT and multiplies it by the quantity. The two can differ
 * by a cent, so when no unit price reproduces the line total exactly the line
 * is printed as a single unit carrying the whole amount, with the quantity in
 * its name.
 */
export function buildReceiptLines(items: SaleItem[]): {
  lines: ReceiptLine[];
  total: number;
} {
  let totalCents = 0;
  const lines = items.map((item) => {
    const vatGroup = VAT_GROUPS[item.vatRate];
    if (!vatGroup) {
      throw new BadRequestException({
        message: `Unsupported VAT rate ${item.vatRate}% for "${item.name}"`,
        code: 'POS_UNSUPPORTED_VAT_RATE',
        details: { product: item.name, vatRate: item.vatRate },
      });
    }
    const gross = lineGrossCents(item);
    totalCents += gross;
    const note = item.serialNumber ? `S/N ${item.serialNumber}` : undefined;

    const milli = Math.round(item.quantity * 1000);
    const unitGross = Math.round((gross * 1000) / milli);
    // An exact half cent is avoided too: how the register rounds it is its
    // own business, and the two totals must agree whatever it does.
    const exactHalf = (unitGross * milli) % 1000 === 500;
    if (!exactHalf && Math.round((unitGross * milli) / 1000) === gross) {
      return {
        name: item.name,
        vatGroup,
        unitPrice: (unitGross / 100).toFixed(2),
        quantity: String(milli / 1000),
        unit: item.unit,
        note,
      };
    }
    return {
      name: `${milli / 1000} x ${item.name}`,
      vatGroup,
      unitPrice: (gross / 100).toFixed(2),
      quantity: '1',
      note,
    };
  });
  return { lines, total: totalCents / 100 };
}
