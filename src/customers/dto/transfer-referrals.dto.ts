import { IsNotEmpty, IsString } from 'class-validator';

// Прехвърляне на всички доведени клиенти от един партньор към друг (при
// смяна/прекратяване на договор). Историческият оборот НЕ се мести —
// Order.partnerCustomerId е snapshot.
export class TransferReferralsDto {
  @IsString()
  @IsNotEmpty()
  fromPartnerId: string;

  @IsString()
  @IsNotEmpty()
  toPartnerId: string;
}
