import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { PrismaService } from '../../shared/prisma/prisma.service'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
}

export interface JwtPayload {
  sub: number // 用户数据库 ID
  telegramId: bigint
  douyinId: string
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * 验证 Telegram WebApp initData
   * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  validateInitData(initData: string): TelegramUser | null {
    try {
      const urlParams = new URLSearchParams(initData)
      const hash = urlParams.get('hash')

      if (!hash) {
        return null
      }

      // 移除 hash 参数
      urlParams.delete('hash')

      // 按字母顺序排序并构建数据检查字符串
      const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')

      // 计算 secret key
      const botToken = this.configService.get('BOT_TOKEN')
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest()

      // 计算 hash
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex')

      // 验证 hash
      if (calculatedHash !== hash) {
        console.error('Hash mismatch:', { calculatedHash, hash })
        return null
      }

      // 验证 auth_date (5分钟内有效)
      const authDate = parseInt(urlParams.get('auth_date') || '0')
      const now = Math.floor(Date.now() / 1000)
      if (now - authDate > 300) {
        console.error('Auth date expired:', { authDate, now })
        // 开发环境跳过时间验证
        if (this.configService.get('NODE_ENV') !== 'development') {
          return null
        }
      }

      // 解析用户数据
      const userJson = urlParams.get('user')
      if (!userJson) {
        return null
      }

      return JSON.parse(userJson) as TelegramUser
    } catch (error) {
      console.error('validateInitData error:', error)
      return null
    }
  }

  /**
   * Telegram 登录
   */
  async loginWithTelegram(initData: string) {
    // 验证 initData
    const telegramUser = this.validateInitData(initData)

    if (!telegramUser) {
      throw new UnauthorizedException('Telegram 验证失败')
    }

    // 查找或创建用户
    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramUser.id) },
    })

    if (!user) {
      // 用户不存在，说明没有通过 Bot 注册
      throw new UnauthorizedException('请先通过 Bot 注册账号')
    }

    // 更新用户信息
    user = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      },
    })

    // 生成 JWT Token
    const payload: JwtPayload = {
      sub: user.id,
      telegramId: user.telegramId,
      douyinId: user.douyinId,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        douyinId: user.douyinId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        coins: user.coins,
        isVip: user.isVip,
        isCreator: user.isCreator,
      },
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

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
