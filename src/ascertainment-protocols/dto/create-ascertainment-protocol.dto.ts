import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateAscertainmentProtocolDto {
  @IsOptional()
  @IsString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  recipientName: string;

  @IsOptional()
  @IsString()
  recipientEik?: string;

  @IsOptional()
  @IsString()
  recipientAddress?: string;

  @IsOptional()
  @IsString()
  recipientCity?: string;

  @IsOptional()
  @IsString()
  senderRepresentative?: string;

  @IsOptional()
  @IsString()
  receiverRepresentative?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commissionMembers?: string[];

  @IsOptional()
  @IsString()
  serviceOrderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
