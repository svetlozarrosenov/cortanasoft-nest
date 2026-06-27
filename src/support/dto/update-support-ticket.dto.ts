import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@prisma/client';

/**
 * Admin update — super-admin (OWNER) can change status, priority, category and assignee.
 */
export class UpdateSupportTicketDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsEnum(SupportTicketCategory)
  category?: SupportTicketCategory;

  @IsOptional()
  @IsString()
  assignedToId?: string | null;
}
