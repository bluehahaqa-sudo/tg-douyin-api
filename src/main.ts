import { createApp } from 'vue'
import App from './App.vue'
import './assets/less/index.less'
import { startMock } from '@/mock'
import router from './router'
import mixin from './utils/mixin'
import VueLazyload from '@jambonn/vue-lazyload'
import { createPinia } from 'pinia'
import { useClick } from '@/utils/hooks/useClick'
import bus, { EVENT_KEY } from '@/utils/bus'
import { initAuth } from '@/api/auth'

window.isMoved = false
// 检测是否在 Telegram Mini App 环境中
const isTelegramWebApp = !!(window as any).Telegram?.WebApp

// 初始化 Telegram 认证
if (isTelegramWebApp) {
  initAuth().then((success) => {
    if (success) {
      console.log('Telegram auth successful')
    } else {
      console.warn('Telegram auth failed')
    }
  })
}
// Telegram 环境下可以自动播放声音，普通浏览器需要静音
window.isMuted = !isTelegramWebApp
window.showMutedNotice = !isTelegramWebApp
HTMLElement.prototype.addEventListener = new Proxy(HTMLElement.prototype.addEventListener, {
  apply(target, ctx, args) {
    const eventName = args[0]
    const listener = args[1]
    if (listener instanceof Function && eventName === 'click') {
      args[1] = new Proxy(listener, {
        apply(target1, ctx1, args1) {
          // console.log('e', args1)
          // console.log('click点击', window.isMoved)
          if (window.isMoved) return
          try {
            return target1.apply(ctx1, args1)
          } catch (e) {
            console.error(`[proxyPlayerEvent][${eventName}]`, listener, e)
          }
        }
      })
    }
    return target.apply(ctx, args)
  }
})

const vClick = useClick()
const pinia = createPinia()
const app = createApp(App)
app.mixin(mixin)
const loadImage = new URL('./assets/img/icon/img-loading.png', import.meta.url).href
app.use(VueLazyload, {
  preLoad: 1.3,
  loading: loadImage,
  attempt: 1
})
app.use(pinia)
app.use(router)
app.mount('#app')
app.directive('click', vClick)

//放到最后才可以使用pinia
startMock()
// 只有在非 Telegram 环境下才需要延迟隐藏静音提示
if (!isTelegramWebApp) {
  setTimeout(() => {
    bus.emit(EVENT_KEY.HIDE_MUTED_NOTICE)
    window.showMutedNotice = false
  }, 2000)
}
bus.on(EVENT_KEY.REMOVE_MUTED, () => {
  window.isMuted = false
})
