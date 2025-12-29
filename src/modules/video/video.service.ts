import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma/prisma.service'

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取推荐视频列表
   */
  async getRecommendVideos(
    page: number | string = 1,
    pageSize: number | string = 10,
    currentUserId?: number,
  ) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 10

    const videos = await this.prisma.video.findMany({
      where: { status: 'approved' },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            douyinId: true,
            username: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { isRecommended: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (pageNum - 1) * size,
      take: size,
    })

    // 如果有当前用户，查询点赞和收藏状态
    let likedVideoIds: Set<number> = new Set()
    let collectedVideoIds: Set<number> = new Set()

    if (currentUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { telegramId: true },
      })

      if (user) {
        const videoIds = videos.map((v) => v.id)

        const [likes, collects] = await Promise.all([
          this.prisma.like.findMany({
            where: { userId: user.telegramId, videoId: { in: videoIds } },
            select: { videoId: true },
          }),
          this.prisma.collect.findMany({
            where: { userId: user.telegramId, videoId: { in: videoIds } },
            select: { videoId: true },
          }),
        ])

        likedVideoIds = new Set(likes.map((l) => l.videoId))
        collectedVideoIds = new Set(collects.map((c) => c.videoId))
      }
    }

    return {
      list: videos.map((video) => this.formatVideo(video, likedVideoIds, collectedVideoIds)),
      page: pageNum,
      pageSize: size,
      hasMore: videos.length === size,
    }
  }

  /**
   * 获取热门视频
   */
  async getHotVideos(
    page: number | string = 1,
    pageSize: number | string = 10,
    currentUserId?: number,
  ) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 10

    const videos = await this.prisma.video.findMany({
      where: { status: 'approved' },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            douyinId: true,
            username: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ likeCount: 'desc' }, { viewCount: 'desc' }],
      skip: (pageNum - 1) * size,
      take: size,
    })

    return {
      list: videos.map((video) => this.formatVideo(video)),
      page: pageNum,
      pageSize: size,
      hasMore: videos.length === size,
    }
  }

  /**
   * 获取视频详情
   */
  async getVideoById(videoId: number, currentUserId?: number) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            douyinId: true,
            username: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!video) {
      throw new NotFoundException('视频不存在')
    }

    // 增加播放量
    await this.prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
    })

    // 查询当前用户的点赞和收藏状态
    let isLiked = false
    let isCollected = false

    if (currentUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { telegramId: true },
      })

      if (user) {
        const [like, collect] = await Promise.all([
          this.prisma.like.findUnique({
            where: { userId_videoId: { userId: user.telegramId, videoId } },
          }),
          this.prisma.collect.findUnique({
            where: { userId_videoId: { userId: user.telegramId, videoId } },
          }),
        ])

        isLiked = !!like
        isCollected = !!collect
      }
    }

    return {
      ...this.formatVideo(video),
      isLiked,
      isCollected,
    }
  }

  /**
   * 获取视频评论
   */
  async getVideoComments(
    videoId: number,
    page: number | string = 1,
    pageSize: number | string = 20,
  ) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 20

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { videoId, parentId: null }, // 只获取顶级评论
        include: {
          user: {
            select: {
              id: true,
              douyinId: true,
              username: true,
              firstName: true,
              avatarUrl: true,
            },
          },
          replies: {
            take: 3, // 每条评论显示3条回复
            include: {
              user: {
                select: {
                  id: true,
                  douyinId: true,
                  username: true,
                  firstName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
        skip: (pageNum - 1) * size,
        take: size,
      }),
      this.prisma.comment.count({ where: { videoId, parentId: null } }),
    ])

    return {
      list: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        likeCount: comment.likeCount,
        replyCount: comment._count.replies,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          douyinId: comment.user.douyinId,
          username: comment.user.username,
          nickname: comment.user.firstName,
          avatarUrl: comment.user.avatarUrl,
        },
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          likeCount: reply.likeCount,
          createdAt: reply.createdAt,
          user: {
            id: reply.user.id,
            douyinId: reply.user.douyinId,
            username: reply.user.username,
            nickname: reply.user.firstName,
            avatarUrl: reply.user.avatarUrl,
          },
        })),
      })),
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
      total,
    }
  }

  /**
   * 发表评论
   */
  async addComment(userId: number, videoId: number, content: string, parentId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      throw new BadRequestException('用户不存在')
    }

    // 检查视频是否存在
    const video = await this.prisma.video.findUnique({ where: { id: videoId } })
    if (!video) {
      throw new NotFoundException('视频不存在')
    }

    // 如果是回复，检查父评论是否存在
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({ where: { id: parentId } })
      if (!parentComment) {
        throw new NotFoundException('评论不存在')
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId: user.telegramId,
        videoId,
        parentId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            douyinId: true,
            username: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
    })

    // 更新视频评论数
    await this.prisma.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    })

    return {
      id: comment.id,
      content: comment.content,
      likeCount: 0,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        douyinId: comment.user.douyinId,
        username: comment.user.username,
        nickname: comment.user.firstName,
        avatarUrl: comment.user.avatarUrl,
      },
    }
  }

  /**
   * 点赞视频
   */
  async likeVideo(userId: number, videoId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      throw new BadRequestException('用户不存在')
    }

    // 检查是否已点赞
    const existingLike = await this.prisma.like.findUnique({
      where: { userId_videoId: { userId: user.telegramId, videoId } },
    })

    if (existingLike) {
      return { success: true, isLiked: true }
    }

    // 创建点赞记录
    await this.prisma.like.create({
      data: { userId: user.telegramId, videoId },
    })

    // 更新视频点赞数
    await this.prisma.video.update({
      where: { id: videoId },
      data: { likeCount: { increment: 1 } },
    })

    return { success: true, isLiked: true }
  }

  /**
   * 取消点赞
   */
  async unlikeVideo(userId: number, videoId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      throw new BadRequestException('用户不存在')
    }

    // 检查是否已点赞
    const existingLike = await this.prisma.like.findUnique({
      where: { userId_videoId: { userId: user.telegramId, videoId } },
    })

    if (!existingLike) {
      return { success: true, isLiked: false }
    }

    // 删除点赞记录
    await this.prisma.like.delete({
      where: { userId_videoId: { userId: user.telegramId, videoId } },
    })

    // 更新视频点赞数
    await this.prisma.video.update({
      where: { id: videoId },
      data: { likeCount: { decrement: 1 } },
    })

    return { success: true, isLiked: false }
  }

  /**
   * 收藏视频
   */
  async collectVideo(userId: number, videoId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      throw new BadRequestException('用户不存在')
    }

    // 检查是否已收藏
    const existingCollect = await this.prisma.collect.findUnique({
      where: { userId_videoId: { userId: user.telegramId, videoId } },
    })

    if (existingCollect) {
      return { success: true, isCollected: true }
    }

    // 创建收藏记录
    await this.prisma.collect.create({
      data: { userId: user.telegramId, videoId },
    })

    return { success: true, isCollected: true }
  }

  /**
   * 取消收藏
   */
  async uncollectVideo(userId: number, videoId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      throw new BadRequestException('用户不存在')
    }

    // 检查是否已收藏
    const existingCollect = await this.prisma.collect.findUnique({
      where: { userId_videoId: { userId: user.telegramId, videoId } },
    })

    if (!existingCollect) {
      return { success: true, isCollected: false }
    }

    // 删除收藏记录
    await this.prisma.collect.delete({
      where: { userId_videoId: { userId: user.telegramId, videoId } },
    })

    return { success: true, isCollected: false }
  }

  /**
   * 获取用户收藏的视频
   */
  async getUserCollects(userId: number, page: number | string = 1, pageSize: number | string = 10) {
    const pageNum = Number(page) || 1
    const size = Number(pageSize) || 10

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { list: [], page: pageNum, pageSize: size, hasMore: false }
    }

    const collects = await this.prisma.collect.findMany({
      where: { userId: user.telegramId },
      include: {
        video: {
          include: {
            user: {
              select: {
                id: true,
                douyinId: true,
                username: true,
                firstName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * size,
      take: size,
    })

    return {
      list: collects.map((c) => this.formatVideo(c.video)),
      page: pageNum,
      pageSize: size,
      hasMore: collects.length === size,
    }
  }

  private formatVideo(
    video: any,
    likedVideoIds?: Set<number>,
    collectedVideoIds?: Set<number>,
  ) {
    return {
      id: video.id,
      odId: video.odId,
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      coverUrl: video.coverUrl,
      duration: video.duration,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      shareCount: video.shareCount,
      isAdult: video.isAdult,
      createdAt: video.createdAt,
      isLiked: likedVideoIds ? likedVideoIds.has(video.id) : false,
      isCollected: collectedVideoIds ? collectedVideoIds.has(video.id) : false,
      author: video.user
        ? {
            id: video.user.id,
            telegramId: video.user.telegramId?.toString(),
            douyinId: video.user.douyinId,
            username: video.user.username,
            nickname: video.user.firstName,
            avatarUrl: video.user.avatarUrl,
          }
        : null,
    }
  }
}
