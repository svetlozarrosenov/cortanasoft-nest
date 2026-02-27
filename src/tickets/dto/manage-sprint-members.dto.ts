import { IsArray, IsString } from 'class-validator';

export class ManageSprintMembersDto {
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}
