import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';

export enum ChatRoomType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  participantIds: string[];
}
