/** Подразбиранията от Настройки > Куриери > Pigeon (всяко може да се смени за една пратка). */
export interface PigeonSettings {
  pickupType: 'address' | 'office' | 'locker';
  pickupOfficeId?: number;
  senderAddressId?: number;
  serviceType: 'standard' | 'express';
  whoPays: 'sender' | 'receiver';
  codEnabled: boolean;
  declaredValueEnabled: boolean;
  smsNotification: boolean;
  returnAtMyExpense: boolean;
}
