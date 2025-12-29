import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common'
import { MessageService, NotificationType } from './message.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/auth.service'

@Controller('message')
export class MessageController {
  constructor(private messageService: MessageService) {}

  /**
   * 获取通知列表
   * GET /api/message/notifications
   */
  @Get('notifications')
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: NotificationType,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.messageService.getNotifications(user.sub, type, page, pageSize)
  }

  /**
   * 获取未读通知数量
   * GET /api/message/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.messageService.getUnreadCount(user.sub)
  }

  /**
   * 标记通知为已读
   * POST /api/message/notifications/:id/read
   */
  @Post('notifications/:id/read')
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.messageService.markAsRead(user.sub, parseInt(id))
  }

  /**
   * 标记所有通知为已读
   * POST /api/message/notifications/read-all
   */
  @Post('notifications/read-all')
  async markAllAsRead(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: NotificationType,
  ) {
    return this.messageService.markAllAsRead(user.sub, type)
  }

  /**
   * 获取私信会话列表
   * GET /api/message/conversations
   */
  @Get('conversations')
  async getConversations(
    @CurrentUser() user: JwtPayload,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.messageService.getConversations(user.sub, page, pageSize)
  }

  /**
   * 获取私信详情
   * GET /api/message/conversations/:id
   */
  @Get('conversations/:id')
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.messageService.getMessages(user.sub, parseInt(id), page, pageSize)
  }

  /**
   * 发送私信
   * POST /api/message/send
   */
  @Post('send')
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() body: { toUserId: number; content: string },
  ) {
    return this.messageService.sendMessage(user.sub, body.toUserId, body.content)
  }
}
