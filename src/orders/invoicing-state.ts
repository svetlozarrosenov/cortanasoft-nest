// Състояние на фактурирането на доставена продажба.
// Фактурата се издава до 5 дни от данъчното събитие, т.е. от доставката
// (ЗДДС чл. 113, ал. 4) — списъкът с продажби оцветява реда по това.

export const INVOICE_DEADLINE_DAYS = 5;

export type InvoicingState = 'INVOICED' | 'TO_INVOICE' | 'OVERDUE';

interface OrderForInvoicing {
  status: string;
  deliveredAt: Date | null;
  total: unknown;
  invoicedAmount: unknown;
  createdAt: Date;
}

const DAY_MS = 86_400_000;

// Календарният ден в България като пореден номер — сроковете се броят в дни,
// без часове и без значение в коя часова зона работи сървърът.
const sofiaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Sofia',
});
function dayNumber(d: Date): number {
  const [year, month, day] = sofiaDate.format(d).split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function isFullyInvoiced(order: OrderForInvoicing): boolean {
  // Същата граница като при издаването на фактура (invoices.service)
  return Number(order.invoicedAmount) >= Number(order.total) - 0.01;
}

/** null = продажбата не е доставена, няма какво да се следи */
export function computeInvoicingState(
  order: OrderForInvoicing,
  now: Date = new Date(),
): InvoicingState | null {
  if (order.status !== 'DELIVERED' || !order.deliveredAt) return null;
  if (isFullyInvoiced(order)) return 'INVOICED';
  return dayNumber(now) - dayNumber(order.deliveredAt) > INVOICE_DEADLINE_DAYS
    ? 'OVERDUE'
    : 'TO_INVOICE';
}

/** Последният ден, в който фактурата е в срок */
export function invoiceDueDate(deliveredAt: Date): Date {
  return new Date(deliveredAt.getTime() + INVOICE_DEADLINE_DAYS * DAY_MS);
}

// Подреждане „по спешност": първо доставените без пълна фактура (най-старата
// доставка най-отгоре — там са и просрочените), после фактурираните, накрая
// недоставените. В обратна посока доставените се обръщат, а недоставените
// пак остават накрая.
export function compareByInvoicingUrgency(
  a: OrderForInvoicing,
  b: OrderForInvoicing,
  direction: 'asc' | 'desc',
): number {
  const group = (o: OrderForInvoicing) => {
    if (o.status !== 'DELIVERED' || !o.deliveredAt) return 2;
    const waiting = !isFullyInvoiced(o);
    return direction === 'asc' ? (waiting ? 0 : 1) : waiting ? 1 : 0;
  };
  const ga = group(a);
  const gb = group(b);
  if (ga !== gb) return ga - gb;
  if (ga === 2) return b.createdAt.getTime() - a.createdAt.getTime();
  const diff = a.deliveredAt!.getTime() - b.deliveredAt!.getTime();
  if (diff !== 0) return direction === 'asc' ? diff : -diff;
  return b.createdAt.getTime() - a.createdAt.getTime();
}
