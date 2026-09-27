import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength, ValidateIf } from 'class-validator';

export class CreateContractDto {
  // Номер — ако липсва, се генерира автоматично (CT-2026-00001)
  @IsOptional()
  @IsString()
  number?: string;

  @IsString()
  @MinLength(1)
  title: string;

  // Опционална връзка към клиент (префилва counterparty полетата)
  @IsOptional()
  @IsString()
  customerId?: string;

  // Контрагент (snapshot) — задължително име, останалото по избор.
  // Ако е подаден customerId и липсват, се попълват от клиента.
  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  counterpartyEik?: string;

  @IsOptional()
  @IsString()
  counterpartyAddress?: string;

  @IsOptional()
  @IsString()
  counterpartyContact?: string;

  @IsOptional()
  @IsString()
  counterpartyVatNumber?: string;

  @IsOptional()
  @IsString()
  counterpartyRepresentative?: string;

  @IsOptional()
  @IsString()
  counterpartyEmail?: string;

  // Търговски условия (за {{contract.fee}} / {{contract.annualFee}} / {{contract.users}})
  @ValidateIf((_, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  monthlyFee?: number | null;

  @ValidateIf((_, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  annualFee?: number | null;

  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @IsOptional()
  userLimit?: number | null;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
