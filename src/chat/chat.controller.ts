import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateRoomDto, SendMessageDto } from './dto';

@Controller('companies/:companyId/chat')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  // Get all chat rooms for the user
  @Get('rooms')
  async getRooms(@Param('companyId') companyId: string, @Request() req: any) {
    return this.chatService.getRooms(companyId, req.user.id);
  }

  // Get or create direct chat with another user
  @Post('rooms/direct/:otherUserId')
  async getOrCreateDirectRoom(
    @Param('companyId') companyId: string,
    @Param('otherUserId') otherUserId: string,
    @Request() req: any,
  ) {
    return this.chatService.getOrCreateDirectRoom(
      companyId,
      req.user.id,
      otherUserId,
    );
  }

  // Create a group chat room
  @Post('rooms/group')
  async createGroupRoom(
    @Param('companyId') companyId: string,
    @Body() dto: CreateRoomDto,
    @Request() req: any,
  ) {
    return this.chatService.createGroupRoom(companyId, req.user.id, dto);
  }

  // Get messages for a room
  @Get('rooms/:roomId/messages')
  async getMessages(
    @Param('companyId') companyId: string,
    @Param('roomId') roomId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req: any,
  ) {
    return this.chatService.getMessages(
      companyId,
      req.user.id,
      roomId,
      parseInt(page),
      parseInt(limit),
    );
  }

  // Send a message (REST fallback, WebSocket preferred)
  @Post('rooms/:roomId/messages')
  async sendMessage(
    @Param('companyId') companyId: string,
    @Param('roomId') roomId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    const message = await this.chatService.sendMessage(
      companyId,
      req.user.id,
      roomId,
      dto.content,
    );

    // Get all participants in the room
    const participantIds = await this.chatService.getRoomParticipantIds(roomId);

    // Send message to each participant's personal channel
    for (const participantId of participantIds) {
      const userChannel = `user:${companyId}:${participantId}`;
      this.chatGateway.server.to(userChannel).emit('newMessage', message);
      this.chatGateway.server.to(userChannel).emit('roomUpdated', {
        roomId,
        lastMessage: message,
      });
    }

    return message;
  }

  // Edit a message
  @Patch('messages/:messageId')
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.chatService.editMessage(req.user.id, messageId, dto.content);
  }

  // Delete a message
  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    return this.chatService.deleteMessage(req.user.id, messageId);
  }

  // Get company users (for starting new chats)
  @Get('users')
  async getCompanyUsers(@Param('companyId') companyId: string) {
    return this.chatService.getCompanyUsers(companyId);
  }

  // Mark room as read
  @Post('rooms/:roomId/read')
  async markAsRead(@Param('roomId') roomId: string, @Request() req: any) {
    await this.chatService.markAsRead(roomId, req.user.id);
    return { success: true };
  }
}
