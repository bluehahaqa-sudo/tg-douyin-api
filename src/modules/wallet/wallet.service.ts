import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma/prisma.service'

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取钱包余额
   */
  async getBalance(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        coins: true,
        isVip: true,
        vipExpire: true,
      },
    })

    return {
      coins: user?.coins || 0,
      isVip: user?.isVip || false,
      vipExpire: user?.vipExpire,
    }
  }

  /**
   * 获取交易记录
   */
  async getTransactions(
    userId: number,
    type?: string,
    page: number = 1,
    pageSize: number = 20,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { list: [], page, pageSize, hasMore: false, total: 0 }
    }

    const where: any = { userId: user.telegramId }
    if (type) {
      where.type = type
    }

    const [transactions, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.coinTransaction.count({ where }),
    ])

    return {
      list: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        createdAt: t.createdAt,
      })),
      page,
      pageSize,
      hasMore: page * pageSize < total,
      total,
    }
  }

  /**
   * 每日签到
   */
  async dailyCheckin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, coins: true },
    })

    if (!user) {
      throw new BadRequestException('用户不存在')
    }

    const today = new Date().toISOString().split('T')[0]

    // 检查今日是否已签到
    const existingCheckin = await this.prisma.dailyCheckin.findUnique({
      where: {
        telegramId_checkinDate: {
          telegramId: user.telegramId,
          checkinDate: today,
        },
      },
    })

    if (existingCheckin) {
      throw new BadRequestException('今日已签到')
    }

    const rewardCoins = 5

    // 创建签到记录和更新余额
    await this.prisma.$transaction([
      this.prisma.dailyCheckin.create({
        data: {
          telegramId: user.telegramId,
          checkinDate: today,
          reward: rewardCoins,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { coins: { increment: rewardCoins } },
      }),
      this.prisma.coinTransaction.create({
        data: {
          userId: user.telegramId,
          type: 'daily_checkin',
          amount: rewardCoins,
          balanceAfter: user.coins + rewardCoins,
          description: '每日签到奖励',
        },
      }),
    ])

    return {
      success: true,
      reward: rewardCoins,
      newBalance: user.coins + rewardCoins,
    }
  }

  /**
   * 检查今日签到状态
   */
  async getCheckinStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    })

    if (!user) {
      return { hasCheckedIn: false }
    }

    const today = new Date().toISOString().split('T')[0]

    const checkin = await this.prisma.dailyCheckin.findUnique({
      where: {
        telegramId_checkinDate: {
          telegramId: user.telegramId,
          checkinDate: today,
        },
      },
    })

    return {
      hasCheckedIn: !!checkin,
      checkinTime: checkin?.createdAt,
    }
  }

  /**
   * 获取邀请奖励记录
   */
  async getInviteRewards(userId: number, page: number = 1, pageSize: number = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, inviteCount: true, inviteCode: true },
    })

    if (!user) {
      return { list: [], page, pageSize, hasMore: false, total: 0, inviteCount: 0 }
    }

    const [records, total] = await Promise.all([
      this.prisma.inviteRecord.findMany({
        where: { inviterId: user.telegramId },
        include: {
          invitee: {
            select: {
              username: true,
              firstName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inviteRecord.count({
        where: { inviterId: user.telegramId },
      }),
    ])

    return {
      list: records.map((r) => ({
        id: r.id,
        inviteeName: r.invitee.firstName || r.invitee.username || 'Unknown',
        rewardCoins: r.rewardCoins,
        isRewarded: r.isRewarded,
        createdAt: r.createdAt,
      })),
      page,
      pageSize,
      hasMore: page * pageSize < total,
      total,
      inviteCount: user.inviteCount,
      inviteCode: user.inviteCode,
    }
  }
}
