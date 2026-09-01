import { IsOptional, IsString } from 'class-validator';

// NB: глобалният ValidationPipe е whitelist:true — без декоратор siteId
// щеше да бъде отрязан от тялото.
export class CheckInDto {
  @IsString()
  @IsOptional()
  siteId?: string;
}
