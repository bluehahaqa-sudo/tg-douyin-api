import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma/prisma.service'

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'system'

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取通知列表
   */
  async getNotifications(
    userId: number,
    type?: NotificationType,
    page: number | string = 1,
    pageSize: number | string = 20,
  ) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 20

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { list: [], page: pageNum, pageSize: size, hasMore: false, total: 0 }
    }

    const where: any = { receiverId: user.telegramId }
    if (type) {
      where.type = type
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              douyinId: true,
              username: true,
              firstName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      this.prisma.notification.count({ where }),
    ])

    return {
      list: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        content: n.content,
        relatedId: n.relatedId,
        relatedType: n.relatedType,
        isRead: n.isRead,
        createdAt: n.createdAt,
        sender: n.sender
          ? {
              id: n.sender.id,
              douyinId: n.sender.douyinId,
              username: n.sender.username,
              nickname: n.sender.firstName,
              avatarUrl: n.sender.avatarUrl,
            }
          : null,
      })),
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
      total,
    }
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { total: 0, likes: 0, comments: 0, follows: 0, system: 0 }
    }

    const [total, likes, comments, follows, system] = await Promise.all([
      this.prisma.notification.count({
        where: { receiverId: user.telegramId, isRead: false },
      }),
      this.prisma.notification.count({
        where: { receiverId: user.telegramId, isRead: false, type: 'like' },
      }),
      this.prisma.notification.count({
        where: { receiverId: user.telegramId, isRead: false, type: 'comment' },
      }),
      this.prisma.notification.count({
        where: { receiverId: user.telegramId, isRead: false, type: 'follow' },
      }),
      this.prisma.notification.count({
        where: { receiverId: user.telegramId, isRead: false, type: 'system' },
      }),
    ])

    return { total, likes, comments, follows, system }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(userId: number, notificationId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { success: false }
    }

    await this.prisma.notification.updateMany({
      where: { id: notificationId, receiverId: user.telegramId },
      data: { isRead: true },
    })

    return { success: true }
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: number, type?: NotificationType) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { success: false }
    }

    const where: any = { receiverId: user.telegramId, isRead: false }
    if (type) {
      where.type = type
    }

    await this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    })

    return { success: true }
  }

  /**
   * 创建通知
   */
  async createNotification(
    receiverId: bigint,
    type: NotificationType,
    senderId?: bigint,
    content?: string,
    relatedId?: number,
    relatedType?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        receiverId,
        senderId,
        type,
        content,
        relatedId,
        relatedType,
      },
    })
  }

  /**
   * 获取私信会话列表
   */
  async getConversations(userId: number, page: number | string = 1, pageSize: number | string = 20) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 20

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { list: [], page: pageNum, pageSize: size, hasMore: false, total: 0 }
    }

    // 获取所有与当前用户相关的消息，按对话方分组
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: user.telegramId }, { receiverId: user.telegramId }],
      },
      orderBy: { createdAt: 'desc' },
    })

    // 按对话方分组，获取最新消息
    const conversationMap = new Map<bigint, any>()

    for (const msg of messages) {
      const otherId = msg.senderId === user.telegramId ? msg.receiverId : msg.senderId

      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, {
          otherUserId: otherId,
          lastMessage: msg,
          unreadCount: 0,
        })
      }

      // 计算未读数
      if (msg.receiverId === user.telegramId && !msg.isRead) {
        const conv = conversationMap.get(otherId)!
        conv.unreadCount++
      }
    }

    const conversationList = Array.from(conversationMap.values())
      .sort((a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime())
      .slice((pageNum - 1) * size, pageNum * size)

    // 获取对话方用户信息
    const otherUserIds = conversationList.map((c) => c.otherUserId)
    const otherUsers = await this.prisma.user.findMany({
      where: { telegramId: { in: otherUserIds } },
      select: {
        id: true,
        telegramId: true,
        douyinId: true,
        username: true,
        firstName: true,
        avatarUrl: true,
      },
    })

    const userMap = new Map(otherUsers.map((u) => [u.telegramId, u]))

    return {
      list: conversationList.map((conv) => {
        const otherUser = userMap.get(conv.otherUserId)
        return {
          user: otherUser
            ? {
                id: otherUser.id,
                douyinId: otherUser.douyinId,
                username: otherUser.username,
                nickname: otherUser.firstName,
                avatarUrl: otherUser.avatarUrl,
              }
            : null,
          lastMessage: {
            id: conv.lastMessage.id,
            content: conv.lastMessage.content,
            messageType: conv.lastMessage.messageType,
            createdAt: conv.lastMessage.createdAt,
            isMine: conv.lastMessage.senderId === user.telegramId,
          },
          unreadCount: conv.unreadCount,
        }
      }),
      page: pageNum,
      pageSize: size,
      hasMore: conversationMap.size > pageNum * size,
      total: conversationMap.size,
    }
  }

  /**
   * 获取与某用户的私信详情
   */
  async getMessages(
    userId: number,
    otherUserId: number,
    page: number | string = 1,
    pageSize: number | string = 20,
  ) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 20

    const [user, otherUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: otherUserId },
        select: { telegramId: true, id: true, douyinId: true, username: true, firstName: true, avatarUrl: true },
      }),
    ])

    if (!user || !otherUser) {
      return { list: [], page: pageNum, pageSize: size, hasMore: false, total: 0 }
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          OR: [
            { senderId: user.telegramId, receiverId: otherUser.telegramId },
            { senderId: otherUser.telegramId, receiverId: user.telegramId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      this.prisma.message.count({
        where: {
          OR: [
            { senderId: user.telegramId, receiverId: otherUser.telegramId },
            { senderId: otherUser.telegramId, receiverId: user.telegramId },
          ],
        },
      }),
    ])

    // 标记消息为已读
    await this.prisma.message.updateMany({
      where: {
        senderId: otherUser.telegramId,
        receiverId: user.telegramId,
        isRead: false,
      },
      data: { isRead: true },
    })

    return {
      list: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        messageType: msg.messageType,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        isMine: msg.senderId === user.telegramId,
      })),
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
      total,
      otherUser: {
        id: otherUser.id,
        douyinId: otherUser.douyinId,
        username: otherUser.username,
        nickname: otherUser.firstName,
        avatarUrl: otherUser.avatarUrl,
      },
    }
  }

  /**
   * 发送私信
   */
  async sendMessage(userId: number, toUserId: number, content: string, messageType: string = 'text') {
    const [user, toUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: toUserId },
        select: { telegramId: true, privacyAllowMsg: true },
      }),
    ])

    if (!user) {
      throw new BadRequestException('用户不存在')
    }

    if (!toUser) {
      throw new BadRequestException('目标用户不存在')
    }

    if (!toUser.privacyAllowMsg) {
      throw new BadRequestException('该用户不接收私信')
    }

    const message = await this.prisma.message.create({
      data: {
        senderId: user.telegramId,
        receiverId: toUser.telegramId,
        content,
        messageType,
      },
    })

    return {
      success: true,
      messageId: message.id,
      message: {
        id: message.id,
        content: message.content,
        messageType: message.messageType,
        createdAt: message.createdAt,
        isMine: true,
      },
    }
  }
}
