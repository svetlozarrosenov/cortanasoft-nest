import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsString,
  IsNotEmpty,
} from 'class-validator';

// Масова редакция на записи присъствие — засега само обектът (напр. 20
// записа, въведени без обект)
export class BulkUpdateAttendanceDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];

  // Обект, който се задава на всички избрани записи (само задаване — не
  // и изчистване; за отделен запис обектът се маха от формата за редакция)
  @IsString()
  @IsNotEmpty()
  siteId: string;
}
