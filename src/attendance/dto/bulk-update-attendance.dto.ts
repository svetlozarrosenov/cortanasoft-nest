import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsString,
} from 'class-validator';

// Масова редакция на записи присъствие — засега само обектът (напр. 20
// записа, въведени без обект)
export class BulkUpdateAttendanceDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];

  // Обект; празен string изчиства връзката
  @IsString()
  siteId: string;
}
