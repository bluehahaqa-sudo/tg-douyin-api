import { request } from '@/utils/request'

// 获取用户信息
export function userinfo(params?: any) {
  if (params?.userId) {
    return request({ url: `/api/user/${params.userId}`, method: 'get' })
  }
  return request({ url: '/api/user/profile', method: 'get' })
}

// 更新用户资料
export function updateProfile(data: any) {
  return request({ url: '/api/user/profile', method: 'put', data })
}

// 获取用户视频列表
export function userVideoList(params?: any, data?: any) {
  return request({ url: '/api/video/user', method: 'get', params, data })
}

// 获取用户面板数据
export function panel(params?: any, data?: any) {
  return request({ url: '/api/user/profile', method: 'get', params, data })
}

// 获取好友列表
export function friends(params?: any, data?: any) {
  return request({ url: '/api/social/friends', method: 'get', params, data })
}

// 获取用户收藏
export function userCollect(params?: any, data?: any) {
  return request({ url: '/api/user/collections', method: 'get', params, data })
}

// 获取推荐帖子
export function recommendedPost(params?: any, data?: any) {
  return request({ url: '/api/post/recommended', method: 'get', params, data })
}

// 获取推荐商店
export function recommendedShop(params?: any, data?: any) {
  return request({ url: '/api/shop/recommended', method: 'get', params, data })
}

// 关注用户
export function followUser(userId: string) {
  return request({ url: `/api/social/follow/${userId}`, method: 'post' })
}

// 取消关注
export function unfollowUser(userId: string) {
  return request({ url: `/api/social/follow/${userId}`, method: 'delete' })
}

// 获取关注列表
export function getFollowing(userId?: string, params?: any) {
  const url = userId ? `/api/social/following/${userId}` : '/api/social/following'
  return request({ url, method: 'get', params })
}

// 获取粉丝列表
export function getFollowers(userId?: string, params?: any) {
  const url = userId ? `/api/social/followers/${userId}` : '/api/social/followers'
  return request({ url, method: 'get', params })
}
