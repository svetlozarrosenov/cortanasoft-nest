import { ShipmentStatus } from '@prisma/client';

/** Едно събитие от проследяването, нормализирано за панела/страницата. */
export interface CarrierTrackingEvent {
  time: string | null; // ISO
  description: string;
}

/**
 * Какво връща всеки куриер за една пратка, преведено на общ език. Това е
 * единственото, което общият код (синхронизация, статус на продажбата,
 * плащане по НП) разбира — Еконт/Спиди/следващият куриер превеждат към него.
 */
export interface CarrierTrackingResult {
  status: ShipmentStatus;
  shortStatus: string | null; // текстът на куриера, както го показва той
  events: CarrierTrackingEvent[]; // най-новото първо
  sentAt: Date | null; // приета от куриера
  deliveredAt: Date | null; // предадена на получателя
  cod: {
    collectedAmount: number | null; // събрано от получателя
    collectedAt: Date | null;
    paidAmount: number | null; // изплатено на търговеца
    paidAt: Date | null;
    currency: string | null;
  } | null;
  origin: ShipmentOrigin | null; // откъде тръгва пратката
  insurance: ShipmentInsurance | null; // обявена стойност / застраховка
  raw: unknown; // суровият отговор на куриера, за дебъг
}

/** Откъде е предадена пратката: офис на куриера или адрес на подателя. */
export interface ShipmentOrigin {
  officeCode: string | null;
  officeName: string | null;
  address: string | null;
}

/** Обявена стойност (застраховка) и колко струва тя. */
export interface ShipmentInsurance {
  amount: number;
  price: number | null;
  currency: string | null;
}

/** Минимумът, който куриерът получава, за да намери пратката при себе си. */
export interface TrackableShipment {
  id: string;
  shipmentNumber: string | null;
  status: ShipmentStatus;
  trackingData: unknown;
}

export type CarrierTrackingOutcome =
  | { ok: true; result: CarrierTrackingResult }
  | { ok: false; error: string };
