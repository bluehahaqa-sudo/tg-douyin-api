import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma/prisma.service'

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  /**
   * 关注用户
   */
  async followUser(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('不能关注自己')
    }

    const [currentUser, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { telegramId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { telegramId: true },
      }),
    ])

    if (!currentUser) {
      throw new BadRequestException('用户不存在')
    }

    if (!targetUser) {
      throw new NotFoundException('目标用户不存在')
    }

    // 检查是否已关注
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.telegramId,
          followingId: targetUser.telegramId,
        },
      },
    })

    if (existingFollow) {
      return { success: true, isFollowing: true }
    }

    // 创建关注记录
    await this.prisma.follow.create({
      data: {
        followerId: currentUser.telegramId,
        followingId: targetUser.telegramId,
      },
    })

    return { success: true, isFollowing: true }
  }

  /**
   * 取消关注
   */
  async unfollowUser(currentUserId: number, targetUserId: number) {
    const [currentUser, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { telegramId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { telegramId: true },
      }),
    ])

    if (!currentUser || !targetUser) {
      return { success: true, isFollowing: false }
    }

    // 检查是否已关注
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.telegramId,
          followingId: targetUser.telegramId,
        },
      },
    })

    if (!existingFollow) {
      return { success: true, isFollowing: false }
    }

    // 删除关注记录
    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUser.telegramId,
          followingId: targetUser.telegramId,
        },
      },
    })

    return { success: true, isFollowing: false }
  }

  /**
   * 获取关注列表
   */
  async getFollowingList(
    userId: number,
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

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: user.telegramId },
        include: {
          following: {
            select: {
              id: true,
              douyinId: true,
              username: true,
              firstName: true,
              avatarUrl: true,
              isVip: true,
              isCreator: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      this.prisma.follow.count({ where: { followerId: user.telegramId } }),
    ])

    return {
      list: follows.map((f) => ({
        id: f.following.id,
        douyinId: f.following.douyinId,
        username: f.following.username,
        nickname: f.following.firstName,
        avatarUrl: f.following.avatarUrl,
        isVip: f.following.isVip,
        isCreator: f.following.isCreator,
        followedAt: f.createdAt,
      })),
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
      total,
    }
  }

  /**
   * 获取粉丝列表
   */
  async getFollowersList(
    userId: number,
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

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: user.telegramId },
        include: {
          follower: {
            select: {
              id: true,
              douyinId: true,
              username: true,
              firstName: true,
              avatarUrl: true,
              isVip: true,
              isCreator: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      this.prisma.follow.count({ where: { followingId: user.telegramId } }),
    ])

    return {
      list: follows.map((f) => ({
        id: f.follower.id,
        douyinId: f.follower.douyinId,
        username: f.follower.username,
        nickname: f.follower.firstName,
        avatarUrl: f.follower.avatarUrl,
        isVip: f.follower.isVip,
        isCreator: f.follower.isCreator,
        followedAt: f.createdAt,
      })),
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
      total,
    }
  }

  /**
   * 获取好友列表（互相关注）
   */
  async getFriendsList(userId: number, page: number | string = 1, pageSize: number | string = 20) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 20

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { list: [], page: pageNum, pageSize: size, hasMore: false, total: 0 }
    }

    // 获取我关注的人
    const myFollowing = await this.prisma.follow.findMany({
      where: { followerId: user.telegramId },
      select: { followingId: true },
    })

    const myFollowingIds = myFollowing.map((f) => f.followingId)

    // 在我关注的人中，找到也关注了我的人（互相关注）
    const [friends, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followerId: { in: myFollowingIds },
          followingId: user.telegramId,
        },
        include: {
          follower: {
            select: {
              id: true,
              douyinId: true,
              username: true,
              firstName: true,
              avatarUrl: true,
              isVip: true,
              isCreator: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      this.prisma.follow.count({
        where: {
          followerId: { in: myFollowingIds },
          followingId: user.telegramId,
        },
      }),
    ])

    return {
      list: friends.map((f) => ({
        id: f.follower.id,
        douyinId: f.follower.douyinId,
        username: f.follower.username,
        nickname: f.follower.firstName,
        avatarUrl: f.follower.avatarUrl,
        isVip: f.follower.isVip,
        isCreator: f.follower.isCreator,
      })),
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
      total,
    }
  }

  /**
   * 检查关注状态
   */
  async checkFollowStatus(currentUserId: number, targetUserId: number) {
    const [currentUser, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { telegramId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { telegramId: true },
      }),
    ])

    if (!currentUser || !targetUser) {
      return { isFollowing: false, isFollowedBy: false, isFriend: false }
    }

    const [following, followedBy] = await Promise.all([
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.telegramId,
            followingId: targetUser.telegramId,
          },
        },
      }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUser.telegramId,
            followingId: currentUser.telegramId,
          },
        },
      }),
    ])

    const isFollowing = !!following
    const isFollowedBy = !!followedBy

    return {
      isFollowing,
      isFollowedBy,
      isFriend: isFollowing && isFollowedBy,
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(keyword: string, page: number | string = 1, pageSize: number | string = 20) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 20

    if (!keyword || keyword.trim() === '') {
      return { list: [], page: pageNum, pageSize: size, hasMore: false }
    }

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: keyword } },
          { firstName: { contains: keyword } },
          { douyinId: { contains: keyword } },
        ],
      },
      select: {
        id: true,
        douyinId: true,
        username: true,
        firstName: true,
        avatarUrl: true,
        isVip: true,
        isCreator: true,
      },
      skip: (pageNum - 1) * size,
      take: size,
    })

    return {
      list: users.map((user) => ({
        id: user.id,
        douyinId: user.douyinId,
        username: user.username,
        nickname: user.firstName,
        avatarUrl: user.avatarUrl,
        isVip: user.isVip,
        isCreator: user.isCreator,
      })),
      page: pageNum,
      pageSize: size,
      hasMore: users.length === size,
    }
  }

  /**
   * 获取用户统计数据
   */
  async getUserStats(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { followingCount: 0, followersCount: 0, likesCount: 0 }
    }

    const [followingCount, followersCount, likesCount] = await Promise.all([
      this.prisma.follow.count({ where: { followerId: user.telegramId } }),
      this.prisma.follow.count({ where: { followingId: user.telegramId } }),
      this.prisma.like.count({ where: { userId: user.telegramId } }),
    ])

    return {
      followingCount,
      followersCount,
      likesCount,
    }
  }
}
