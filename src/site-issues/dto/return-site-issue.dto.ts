import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  Min,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnSiteIssueItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}

export class ReturnSiteIssueDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnSiteIssueItemDto)
  items: ReturnSiteIssueItemDto[];
}
