import { IsString, MinLength } from 'class-validator';

export class UpdateSupportTicketDescriptionDto {
  @IsString()
  @MinLength(1)
  description: string;
}
