import { CreateShipmentDto, CalculateShippingDto } from '../dto/create-shipment.dto';

/**
 * Унифициран контракт, който всеки carrier модул (Econt, Speedy, DHL...)
 * трябва да имплементира. Това позволява ShippingService да работи с тях
 * без да знае техните specifics.
 */
export interface ShippingProvider {
  /** Уникален идентификатор: 'econt', 'speedy', 'dhl', ... */
  readonly name: string;

  /** Тества дали credentials-ите работят. */
  testConnection(companyId: string): Promise<{ success: boolean; [key: string]: any }>;

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

  /** Проследяване по shipment ID. */
  trackShipment(companyId: string, shipment: any): Promise<any>;

  /** Анулира пратка в provider API (best-effort). */
  cancelShipment(companyId: string, shipment: any): Promise<void>;
}
