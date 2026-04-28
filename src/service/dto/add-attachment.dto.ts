import { IsString, IsOptional, IsIn } from 'class-validator';

export class AddServiceAttachmentDto {
  @IsString()
  url: string;

  @IsString()
  fileName: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  @IsIn(['photo_in', 'photo_out', 'invoice_supplier', 'other'])
  kind?: string;
}
