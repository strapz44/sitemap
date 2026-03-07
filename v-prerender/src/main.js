// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import axios from 'axios'

// Ensure axios sends/receives cookies (for auth)
axios.defaults.withCredentials = true

if (typeof window !== 'undefined' && axios?.defaults?.headers?.common) {
  axios.defaults.headers.common['x-site'] = window.location.host
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getSessionId() {
  try {
    let id = sessionStorage.getItem('session_id')
    if (!id) { id = uuid(); sessionStorage.setItem('session_id', id) }
    return id
  } catch {
    return null
  }
}

function detectClient() {
  try {
    const ua = navigator.userAgent || ''
    const w = (window && window.screen && window.screen.width) ? window.screen.width : 0
    const device = /iPad|Tablet/i.test(ua) ? 'tablet' : (/Mobi|Android/i.test(ua) || w < 768 ? 'mobile' : 'desktop')
    let browser = 'Other'
    if (/Edg\//.test(ua)) browser = 'Edge'
    else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = 'Opera'
    else if (/Chrome\//.test(ua)) browser = 'Chrome'
    else if (/Safari\//.test(ua)) browser = 'Safari'
    else if (/Firefox\//.test(ua)) browser = 'Firefox'
    else if (/MSIE|Trident/.test(ua)) browser = 'IE'
    let os = 'Other'
    if (/Windows NT/i.test(ua)) os = 'Windows'
    else if (/Mac OS X/i.test(ua)) os = 'macOS'
    else if (/Android/i.test(ua)) os = 'Android'
    else if (/(iPhone|iPad|iPod)/i.test(ua)) os = 'iOS'
    else if (/Linux/i.test(ua)) os = 'Linux'
    return { device, browser, os }
  } catch {
    return { device: null, browser: null, os: null }
  }
}

function getUTM(path) {
  try {
    const u = new URL(path || '/', window.location.origin)
    const s = sessionStorage
    const fromUrl = {
      utm_source: u.searchParams.get('utm_source'),
      utm_medium: u.searchParams.get('utm_medium'),
      utm_campaign: u.searchParams.get('utm_campaign'),
    }
    const src = fromUrl.utm_source || s.getItem('utm_source') || ''
    const med = fromUrl.utm_medium || s.getItem('utm_medium') || ''
    const camp = fromUrl.utm_campaign || s.getItem('utm_campaign') || ''
    if (fromUrl.utm_source) s.setItem('utm_source', src)
    if (fromUrl.utm_medium) s.setItem('utm_medium', med)
    if (fromUrl.utm_campaign) s.setItem('utm_campaign', camp)
    return { utm_source: src || null, utm_medium: med || null, utm_campaign: camp || null }
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null }
  }
}

router.afterEach((to) => {
  const size = typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : ''
  const href = typeof window !== 'undefined' ? window.location.href : ''
  const title = typeof document !== 'undefined' ? document.title : ''
  const ref = typeof document !== 'undefined' ? document.referrer : ''
  const lang = typeof navigator !== 'undefined' ? navigator.language : ''

  const session_id = getSessionId()
  const { device, browser, os } = detectClient()
  const { utm_source, utm_medium, utm_campaign } = getUTM(to.fullPath || '')

  axios.post('/api/collect', {
    type: 'pageview',
    url: href,
    pathname: to.fullPath || '',
    title,
    referrer: ref,
    lang,
    screen: size,
    session_id,
    device,
    browser,
    os,
    utm_source,
    utm_medium,
    utm_campaign,
  }).catch(() => null)
})

createApp(App).use(router).mount('#app')
