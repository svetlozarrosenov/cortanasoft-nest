import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// Допустимите Meta standard events за нашия landing site funnel.
// Ако някога ни потрябва нов event — добавяме го тук + на frontend helper-а.
const ALLOWED_EVENTS = ['Lead', 'Contact', 'ViewContent', 'CompleteRegistration'] as const;
type AllowedEvent = (typeof ALLOWED_EVENTS)[number];

export class TrackMetaPixelEventDto {
  @IsString()
  @IsIn(ALLOWED_EVENTS as unknown as string[], {
    message: `event_name трябва да е един от: ${ALLOWED_EVENTS.join(', ')}`,
  })
  event_name!: AllowedEvent;

  // UUID генериран от browser-а; същият се подава и на fbq() през { eventID }
  // → Meta дедуплицира browser Pixel и CAPI като 1 event.
  @IsString()
  @MaxLength(64)
  event_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  event_source_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  content_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
