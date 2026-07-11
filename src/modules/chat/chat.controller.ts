import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ChatGateway } from './chat.gateway';
import { SendImageMessageDto } from './dto/send-image-message.dto';

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
  async getMissionMessages(
    @Req() req: any,
    @Param('missionId') missionId: string,
  ) {
    return this.chatService.getMissionMessages(req.user.id, missionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async sendMessage(
    @Req() req: any,
    @Body() dto: SendMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const message = file
      ? await this.chatService.sendImageMessage(req.user.id, dto as any, file)
      : await this.chatService.sendMessage(req.user.id, dto as any);
    this.chatGateway.broadcastNewMessage(message);
    return message;
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadImage(
    @Req() req: any,
    @Body() dto: SendImageMessageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image manquante');
    }
    const message = await this.chatService.sendImageMessage(
      req.user.id,
      dto as any,
      file,
    );
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

  @UseGuards(JwtAuthGuard)
  @Patch(':messageId')
  async updateMessage(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    const message = await this.chatService.updateMessage(
      messageId,
      req.user.id,
      dto as any,
    );
    this.chatGateway.broadcastMessageUpdated(message);
    return message;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':messageId')
  async deleteMessage(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body() body?: { clientMessageId?: string },
  ) {
    const result = await this.chatService.deleteMessage(
      messageId,
      req.user.id,
      body?.clientMessageId,
    );
    this.chatGateway.broadcastMessageDeleted(result);
    return result;
  }
}
