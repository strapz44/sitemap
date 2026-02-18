// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'
import SitemapView from './views/SitemapView.vue'
import SitemapDetailsView from './views/SitemapDetailsView.vue'
import DashboardView from './views/DashboardView.vue'
import AnalyticsView from './views/AnalyticsView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'

// Ensure axios sends/receives cookies (for auth)
axios.defaults.withCredentials = true

// Consistent API base for auth checks (works for localhost -> remote API too)
const API_URL = (import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'

const routes = [
  { path: '/', name: 'home', component: SitemapView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/analytics', name: 'analytics', component: AnalyticsView, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/sitemaps/:siteName(.*)', name: 'sitemap-details', component: SitemapDetailsView, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Simple auth state and guard; checks cookie session once, redirects to login if needed
const authState = { checked: false, user: null }
router.beforeEach(async (to, from, next) => {
  if (to.meta && to.meta.requiresAuth) {
    if (!authState.checked) {
      try {
        const r = await axios.get(`${API_URL}/auth/me`)
        authState.user = r?.data?.user || null
      } catch {
        authState.user = null
      }
      authState.checked = true
    }
    if (!authState.user) {
      return next({ name: 'login', query: { redirect: to.fullPath } })
    }
  }
  next()
})

if (typeof window !== 'undefined' && axios && axios.defaults && axios.defaults.headers && axios.defaults.headers.common) {
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
