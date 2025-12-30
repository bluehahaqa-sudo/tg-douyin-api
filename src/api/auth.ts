import { axiosInstance, setToken, clearToken } from '@/utils/request'

interface TelegramAuthResponse {
  success: boolean
  data: {
    access_token: string
    user: {
      id: string
      tgId: string
      username: string
      firstName: string
      lastName: string
      avatar: string
    }
  }
}

// Telegram Mini App 认证
export async function telegramAuth(): Promise<TelegramAuthResponse | null> {
  // 获取 Telegram WebApp 数据
  const tg = (window as any).Telegram?.WebApp
  if (!tg) {
    console.warn('Not running in Telegram Mini App')
    return null
  }

  const initData = tg.initData
  if (!initData) {
    console.warn('No Telegram initData available')
    return null
  }

  try {
    const response = await axiosInstance.post('/api/auth/telegram', {
      initData
    })

    if (response.data?.access_token) {
      setToken(response.data.access_token)
      return { success: true, data: response.data }
    }
    return null
  } catch (error) {
    console.error('Telegram auth failed:', error)
    return null
  }
}

// 获取当前用户信息
export async function getCurrentUser() {
  try {
    const response = await axiosInstance.get('/api/auth/me')
    return response.data
  } catch (error) {
    console.error('Get current user failed:', error)
    return null
  }
}

// 退出登录
export function logout() {
  clearToken()
}

// 初始化认证（在应用启动时调用）
export async function initAuth(): Promise<boolean> {
  const token = localStorage.getItem('auth_token')

  // 如果已有 token，验证是否有效
  if (token) {
    const user = await getCurrentUser()
    if (user) {
      return true
    }
    // token 无效，清除
    clearToken()
  }

  // 尝试 Telegram 认证
  const result = await telegramAuth()
  return result !== null
}
