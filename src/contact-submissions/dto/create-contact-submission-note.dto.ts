import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactSubmissionNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
