import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async conversations(@Req() req: any) {
    return this.chatService.getConversations(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':missionId')
  async getMissionMessages(@Req() req: any, @Param('missionId') missionId: string) {
    return this.chatService.getMissionMessages(req.user.id, missionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    const message = await this.chatService.sendMessage(req.user.id, dto as any);
    this.chatGateway.broadcastNewMessage(message);
    return message;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':messageId/read')
  async markRead(@Req() req: any, @Param('messageId') messageId: string) {
    const message = await this.chatService.markAsRead(messageId, req.user.id);
    this.chatGateway.broadcastMessageRead(message);
    return message;
  }
}
