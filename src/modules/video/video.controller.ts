import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common'
import { VideoService } from './video.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { JwtPayload } from '../auth/auth.service'

@Controller('video')
export class VideoController {
  constructor(private videoService: VideoService) {}

  /**
   * 获取推荐视频
   * GET /api/video/recommend
   */
  @Public()
  @Get('recommend')
  async getRecommendVideos(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.videoService.getRecommendVideos(page, pageSize)
  }

  /**
   * 获取热门视频
   * GET /api/video/hot
   */
  @Public()
  @Get('hot')
  async getHotVideos(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.videoService.getHotVideos(page, pageSize)
  }

  /**
   * 获取视频详情
   * GET /api/video/:id
   */
  @Public()
  @Get(':id')
  async getVideoById(@Param('id') id: string) {
    return this.videoService.getVideoById(parseInt(id))
  }

  /**
   * 获取视频评论
   * GET /api/video/:id/comments
   */
  @Public()
  @Get(':id/comments')
  async getVideoComments(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.videoService.getVideoComments(parseInt(id), page, pageSize)
  }

  /**
   * 点赞视频
   * POST /api/video/:id/like
   */
  @Post(':id/like')
  async likeVideo(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.videoService.likeVideo(user.sub, parseInt(id))
  }

  /**
   * 取消点赞
   * DELETE /api/video/:id/like
   */
  @Delete(':id/like')
  async unlikeVideo(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.videoService.unlikeVideo(user.sub, parseInt(id))
  }

  /**
   * 收藏视频
   * POST /api/video/:id/collect
   */
  @Post(':id/collect')
  async collectVideo(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.videoService.collectVideo(user.sub, parseInt(id))
  }

  /**
   * 取消收藏
   * DELETE /api/video/:id/collect
   */
  @Delete(':id/collect')
  async uncollectVideo(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.videoService.uncollectVideo(user.sub, parseInt(id))
  }

  /**
   * 发表评论
   * POST /api/video/:id/comment
   */
  @Post(':id/comment')
  async addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: number },
  ) {
    return this.videoService.addComment(user.sub, parseInt(id), body.content, body.parentId)
  }
}
