import { IsString, MinLength } from 'class-validator';

export class UpdateSupportTicketMessageDto {
  @IsString()
  @MinLength(1)
  body: string;
}
