import { Controller, Post, Get, Body } from '@nestjs/common'
import { AuthService, JwtPayload } from './auth.service'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

class TelegramLoginDto {
  initData: string
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Telegram WebApp 登录
   * POST /api/auth/telegram
   */
  @Public()
  @Post('telegram')
  async loginWithTelegram(@Body() dto: TelegramLoginDto) {
    return this.authService.loginWithTelegram(dto.initData)
  }

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   */
  @Get('me')
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub)
  }
}
