// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import http from './lib/http'
import { onAuthExpired } from './lib/http'
import { useAuth } from './composables/useAuth'

// ── Auth: redirect to login when session expires ──
onAuthExpired(() => {
  const { clear } = useAuth()
  clear()
  router.push({ name: 'login' })
})

// ── Analytics: track pageviews (fire-and-forget) ───────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function getSessionId() {
  try {
    let id = sessionStorage.getItem('session_id')
    if (!id) { id = uuid(); sessionStorage.setItem('session_id', id) }
    return id
  } catch { return null }
}

function detectClient() {
  try {
    const ua = navigator.userAgent || ''
    const w = window?.screen?.width || 0
    const device = /iPad|Tablet/i.test(ua) ? 'tablet' : (/Mobi|Android/i.test(ua) || w < 768 ? 'mobile' : 'desktop')
    let browser = 'Other'
    if (/Edg\//.test(ua)) browser = 'Edge'
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
    else if (/Chrome\//.test(ua)) browser = 'Chrome'
    else if (/Safari\//.test(ua)) browser = 'Safari'
    else if (/Firefox\//.test(ua)) browser = 'Firefox'
    let os = 'Other'
    if (/Windows NT/i.test(ua)) os = 'Windows'
    else if (/Mac OS X/i.test(ua)) os = 'macOS'
    else if (/Android/i.test(ua)) os = 'Android'
    else if (/(iPhone|iPad|iPod)/i.test(ua)) os = 'iOS'
    else if (/Linux/i.test(ua)) os = 'Linux'
    return { device, browser, os }
  } catch { return { device: null, browser: null, os: null } }
}

router.afterEach((to) => {
  try {
    const session_id = getSessionId()
    const { device, browser, os } = detectClient()
    http.post('/collect', {
      type: 'pageview',
      url: window.location.href,
      pathname: to.fullPath || '',
      title: document.title || '',
      referrer: document.referrer || '',
      lang: navigator.language || '',
      screen: window.screen ? `${window.screen.width}x${window.screen.height}` : '',
      session_id, device, browser, os,
    }).catch(() => {})
  } catch { /* analytics must never break navigation */ }
})

// ── Bootstrap ───────────────────────────────────────
const app = createApp(App)
app.use(router)
app.mount('#app')

// Restore auth session in background (non-blocking)
const { fetchUser } = useAuth()
fetchUser().then(() => {
  console.debug('[main] fetchUser done, user:', useAuth().user.value)
}).catch(() => {})
