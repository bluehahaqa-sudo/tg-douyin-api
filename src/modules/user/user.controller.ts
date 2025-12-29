import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common'
import { UserService } from './user.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/auth.service'

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * 获取当前用户资料
   * GET /api/user/profile
   */
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.getProfile(user.sub)
  }

  /**
   * 更新当前用户资料
   * PUT /api/user/profile
   */
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: { nickname?: string; bio?: string },
  ) {
    return this.userService.updateProfile(user.sub, body)
  }

  /**
   * 获取用户设置
   * GET /api/user/settings
   */
  @Get('settings')
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.userService.getSettings(user.sub)
  }

  /**
   * 更新通知设置
   * PUT /api/user/settings/notification
   */
  @Put('settings/notification')
  async updateNotificationSettings(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      likes?: boolean
      comments?: boolean
      followers?: boolean
      system?: boolean
    },
  ) {
    return this.userService.updateNotificationSettings(user.sub, body)
  }

  /**
   * 更新隐私设置
   * PUT /api/user/settings/privacy
   */
  @Put('settings/privacy')
  async updatePrivacySettings(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      showLikes?: boolean
      showFollows?: boolean
      allowMsg?: boolean
      allowDuet?: boolean
    },
  ) {
    return this.userService.updatePrivacySettings(user.sub, body)
  }

  /**
   * 获取指定用户信息
   * GET /api/user/:id
   */
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(parseInt(id))
  }

  /**
   * 获取用户视频列表
   * GET /api/user/:id/videos
   */
  @Get(':id/videos')
  async getUserVideos(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 12,
  ) {
    return this.userService.getUserVideos(parseInt(id), page, pageSize)
  }
}
