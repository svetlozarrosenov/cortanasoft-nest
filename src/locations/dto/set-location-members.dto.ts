import { IsArray, IsString } from 'class-validator';

export class SetLocationMembersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
