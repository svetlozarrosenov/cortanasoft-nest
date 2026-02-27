import { IsArray, IsString } from 'class-validator';

export class ManageSprintTicketsDto {
  @IsArray()
  @IsString({ each: true })
  ticketIds: string[];
}
