import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma/prisma.service'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户资料
   */
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    return this.formatUser(user)
  }

  /**
   * 获取用户公开信息
   */
  async getUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    // 只返回公开信息
    return {
      id: user.id,
      douyinId: user.douyinId,
      username: user.username,
      firstName: user.firstName,
      isVip: user.isVip,
      isCreator: user.isCreator,
    }
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: number, data: { nickname?: string; bio?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        // 暂时使用 firstName 存储昵称
        firstName: data.nickname,
      },
    })

    return this.formatUser(user)
  }

  /**
   * 获取用户设置
   */
  async getSettings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyLikes: true,
        notifyComments: true,
        notifyFollowers: true,
        notifySystem: true,
        privacyShowLikes: true,
        privacyShowFollows: true,
        privacyAllowMsg: true,
        privacyAllowDuet: true,
      },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    return {
      notification: {
        likes: user.notifyLikes,
        comments: user.notifyComments,
        followers: user.notifyFollowers,
        system: user.notifySystem,
      },
      privacy: {
        showLikes: user.privacyShowLikes,
        showFollows: user.privacyShowFollows,
        allowMsg: user.privacyAllowMsg,
        allowDuet: user.privacyAllowDuet,
      },
    }
  }

  /**
   * 更新通知设置
   */
  async updateNotificationSettings(
    userId: number,
    data: {
      likes?: boolean
      comments?: boolean
      followers?: boolean
      system?: boolean
    },
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notifyLikes: data.likes,
        notifyComments: data.comments,
        notifyFollowers: data.followers,
        notifySystem: data.system,
      },
    })

    return { success: true }
  }

  /**
   * 更新隐私设置
   */
  async updatePrivacySettings(
    userId: number,
    data: {
      showLikes?: boolean
      showFollows?: boolean
      allowMsg?: boolean
      allowDuet?: boolean
    },
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        privacyShowLikes: data.showLikes,
        privacyShowFollows: data.showFollows,
        privacyAllowMsg: data.allowMsg,
        privacyAllowDuet: data.allowDuet,
      },
    })

    return { success: true }
  }

  /**
   * 获取用户视频列表
   */
  async getUserVideos(userId: number, page: number = 1, pageSize: number = 12) {
    const videos = await this.prisma.video.findMany({
      where: {
        userId,
        status: 'approved',
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const total = await this.prisma.video.count({
      where: {
        userId,
        status: 'approved',
      },
    })

    return {
      list: videos,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    }
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      douyinId: user.douyinId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      coins: user.coins,
      isVip: user.isVip,
      vipExpire: user.vipExpire,
      isCreator: user.isCreator,
      isAdultUnlocked: user.isAdultUnlocked,
      inviteCount: user.inviteCount,
      createdAt: user.createdAt,
    }
  }
}
