import { request, axiosInstance } from '@/utils/request'

// 上传视频
export function uploadVideo(formData: FormData, onProgress?: (progress: number) => void) {
  return axiosInstance.post('/api/video/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    }
  })
}

// 删除视频
export function deleteVideo(videoId: string | number) {
  return request({ url: `/api/video/${videoId}`, method: 'delete' })
}

// 获取我的视频列表
export function getMyVideos(params?: { page?: number; pageSize?: number }) {
  return request({ url: '/api/video/my', method: 'get', params })
}

// 获取其他历史视频
export function historyOther(params?: any, data?: any) {
  return request({ url: '/api/video/history', method: 'get', params, data })
}

// 获取历史视频
export function historyVideo(params?: any, data?: any) {
  return request({ url: '/api/video/history', method: 'get', params, data })
}

// 获取推荐视频
export function recommendedVideo(params?: any, data?: any) {
  return request({ url: '/api/video/recommend', method: 'get', params, data })
}

// 获取推荐长视频
export function recommendedLongVideo(params?: any, data?: any) {
  return request({
    url: '/api/video/recommend',
    method: 'get',
    params: { ...params, type: 'long' },
    data
  })
}

// 获取我的视频
export function myVideo(params?: any, data?: any) {
  return request({ url: '/api/video/my', method: 'get', params, data })
}

// 获取私密视频
export function privateVideo(params?: any, data?: any) {
  return request({ url: '/api/video/private', method: 'get', params, data })
}

// 获取点赞的视频
export function likeVideo(params?: any, data?: any) {
  return request({ url: '/api/video/liked', method: 'get', params, data })
}

// 获取视频评论
export function videoComments(params?: any, data?: any) {
  const videoId = params?.videoId || params?.id
  return request({ url: `/api/video/${videoId}/comments`, method: 'get', params, data })
}

// 获取视频详情
export function getVideoDetail(videoId: string) {
  return request({ url: `/api/video/${videoId}`, method: 'get' })
}

// 点赞视频
export function likeVideoAction(videoId: string) {
  return request({ url: `/api/video/${videoId}/like`, method: 'post' })
}

// 取消点赞
export function unlikeVideoAction(videoId: string) {
  return request({ url: `/api/video/${videoId}/like`, method: 'delete' })
}

// 收藏视频
export function collectVideo(videoId: string) {
  return request({ url: `/api/video/${videoId}/collect`, method: 'post' })
}

// 取消收藏
export function uncollectVideo(videoId: string) {
  return request({ url: `/api/video/${videoId}/collect`, method: 'delete' })
}

// 发表评论
export function postComment(videoId: string, content: string, parentId?: string) {
  return request({
    url: `/api/video/${videoId}/comment`,
    method: 'post',
    data: { content, parentId }
  })
}

// 获取热门视频
export function hotVideo(params?: any, data?: any) {
  return request({ url: '/api/video/hot', method: 'get', params, data })
}
