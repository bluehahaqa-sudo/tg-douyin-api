import { Controller, Get, Post, Query } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/auth.service'

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * 获取钱包余额
   * GET /api/wallet/balance
   */
  @Get('balance')
  async getBalance(@CurrentUser() user: JwtPayload) {
    return this.walletService.getBalance(user.sub)
  }

  /**
   * 获取交易记录
   * GET /api/wallet/transactions
   */
  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.walletService.getTransactions(user.sub, type, page, pageSize)
  }

  /**
   * 每日签到
   * POST /api/wallet/checkin
   */
  @Post('checkin')
  async dailyCheckin(@CurrentUser() user: JwtPayload) {
    return this.walletService.dailyCheckin(user.sub)
  }

  /**
   * 获取今日签到状态
   * GET /api/wallet/checkin-status
   */
  @Get('checkin-status')
  async getCheckinStatus(@CurrentUser() user: JwtPayload) {
    return this.walletService.getCheckinStatus(user.sub)
  }

  /**
   * 获取邀请奖励记录
   * GET /api/wallet/invite-rewards
   */
  @Get('invite-rewards')
  async getInviteRewards(
    @CurrentUser() user: JwtPayload,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.walletService.getInviteRewards(user.sub, page, pageSize)
  }
}
