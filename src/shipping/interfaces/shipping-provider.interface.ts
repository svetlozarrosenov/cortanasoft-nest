import {
  CreateShipmentDto,
  CalculateShippingDto,
} from '../dto/create-shipment.dto';
import {
  CarrierTrackingOutcome,
  TrackableShipment,
} from './carrier-tracking.interface';

/**
 * Унифициран контракт, който всеки куриерски модул (Econt, Speedy, ...)
 * имплементира. Общият код (ShippingService, ShipmentSyncService, cron)
 * работи само през него и не знае нищо за конкретните API-та.
 *
 * Нов куриер = нов модул със сервиз, който имплементира интерфейса и е
 * маркиран с @ShippingCarrier(). Регистърът го намира сам — нищо в
 * съществуващия код не се пипа (виж shipping-provider.registry.ts).
 */
export interface ShippingProvider {
  /** Уникален идентификатор: 'econt', 'speedy', 'pigeon', ... (= Shipment.provider) */
  readonly name: string;

  /** Има ли фирмата активна и пълна конфигурация за този куриер. */
  isConfigured(companyId: string): Promise<boolean>;

  /** Тества дали credentials-ите работят. */
  testConnection(
    companyId: string,
  ): Promise<{ success: boolean; [key: string]: any }>;

  /** Изчислява цена за доставка без да създава пратка. */
  calculateShipping(
    companyId: string,
    dto: CalculateShippingDto,
  ): Promise<{ totalPrice: number; [key: string]: any }>;

  /** Създава реална пратка и записва Shipment в DB. Provider-ът сам зарежда конфига. */
  createShipment(
    companyId: string,
    dto: CreateShipmentDto,
    order: any,
  ): Promise<any>;

  /**
   * Статус на много пратки наведнъж (една заявка към куриера, където може).
   * Връща резултат по Shipment.id; пратка без запис в Map-а = куриерът не е
   * казал нищо за нея. Само превод от куриера — нищо не се записва тук.
   */
  trackShipments(
    companyId: string,
    shipments: TrackableShipment[],
  ): Promise<Map<string, CarrierTrackingOutcome>>;

  /**
   * Анулира/изтрива пратката при куриера. Хвърля при отказ — общият код
   * тогава НЕ анулира локално.
   */
  cancelShipment(companyId: string, shipment: any): Promise<void>;
}
