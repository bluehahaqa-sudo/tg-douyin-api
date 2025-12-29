import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
} from '@nestjs/common'
import { SocialService } from './social.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { JwtPayload } from '../auth/auth.service'

@Controller('social')
export class SocialController {
  constructor(private socialService: SocialService) {}

  /**
   * 关注用户
   * POST /api/social/follow/:userId
   */
  @Post('follow/:userId')
  async followUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.socialService.followUser(user.sub, parseInt(userId))
  }

  /**
   * 取消关注
   * DELETE /api/social/follow/:userId
   */
  @Delete('follow/:userId')
  async unfollowUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.socialService.unfollowUser(user.sub, parseInt(userId))
  }

  /**
   * 获取我的关注列表
   * GET /api/social/following
   */
  @Get('following')
  async getMyFollowing(
    @CurrentUser() user: JwtPayload,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.socialService.getFollowingList(user.sub, page, pageSize)
  }

  /**
   * 获取指定用户的关注列表
   * GET /api/social/following/:userId
   */
  @Public()
  @Get('following/:userId')
  async getUserFollowing(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.socialService.getFollowingList(parseInt(userId), page, pageSize)
  }

  /**
   * 获取我的粉丝列表
   * GET /api/social/followers
   */
  @Get('followers')
  async getMyFollowers(
    @CurrentUser() user: JwtPayload,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.socialService.getFollowersList(user.sub, page, pageSize)
  }

  /**
   * 获取指定用户的粉丝列表
   * GET /api/social/followers/:userId
   */
  @Public()
  @Get('followers/:userId')
  async getUserFollowers(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.socialService.getFollowersList(parseInt(userId), page, pageSize)
  }

  /**
   * 获取好友列表（互相关注）
   * GET /api/social/friends
   */
  @Get('friends')
  async getFriends(
    @CurrentUser() user: JwtPayload,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.socialService.getFriendsList(user.sub, page, pageSize)
  }

  /**
   * 检查关注状态
   * GET /api/social/follow-status/:userId
   */
  @Get('follow-status/:userId')
  async checkFollowStatus(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.socialService.checkFollowStatus(user.sub, parseInt(userId))
  }

  /**
   * 搜索用户
   * GET /api/social/search
   */
  @Public()
  @Get('search')
  async searchUsers(
    @Query('keyword') keyword: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.socialService.searchUsers(keyword, page, pageSize)
  }
}
