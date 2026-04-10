import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

// Lazy-load all views for faster initial page load
const SitemapView        = () => import(/* webpackChunkName: "sitemaps" */  '../views/SitemapView.vue')
const SitemapDetailsView = () => import(/* webpackChunkName: "sitemaps" */  '../views/SitemapDetailsView.vue')
const DashboardView      = () => import(/* webpackChunkName: "dashboard" */ '../views/DashboardView.vue')
const AnalyticsView      = () => import(/* webpackChunkName: "analytics" */ '../views/AnalyticsView.vue')
const GlobeView          = () => import(/* webpackChunkName: "globe" */     '../views/GlobeView.vue')
const LoginView          = () => import(/* webpackChunkName: "auth" */      '../views/LoginView.vue')
const RegisterView       = () => import(/* webpackChunkName: "auth" */      '../views/RegisterView.vue')
const ForgotPasswordView = () => import(/* webpackChunkName: "auth" */      '../views/ForgotPasswordView.vue')
const ResetPasswordView  = () => import(/* webpackChunkName: "auth" */      '../views/ResetPasswordView.vue')

const guestOnly = { requiresGuest: true }
const authOnly  = { requiresAuth: true }

const routes = [
  { path: '/', redirect: { name: 'dashboard' } },
  { path: '/sitemaps', name: 'home', component: SitemapView, meta: authOnly },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: authOnly },
  { path: '/analytics', name: 'analytics', component: AnalyticsView, meta: authOnly },
  { path: '/globe', name: 'globe', component: GlobeView, meta: authOnly },
  { path: '/login', name: 'login', component: LoginView, meta: guestOnly },
  { path: '/register', name: 'register', component: RegisterView, meta: guestOnly },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView, meta: guestOnly },
  { path: '/reset-password', name: 'reset-password', component: ResetPasswordView, meta: guestOnly },
  { path: '/sitemaps/:siteName(.*)', name: 'sitemap-details', component: SitemapDetailsView, props: true, meta: authOnly },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * Navigation guard — uses composable state when available,
 * falls back to cookie check for the initial cold load.
 */
router.beforeEach((to, _from, next) => {
  const { isAuthenticated, initialized } = useAuth()

  // Use reactive state if auth has been initialized, otherwise fallback to cookie
  const loggedIn = initialized.value
    ? isAuthenticated.value
    : document.cookie.split(';').some(c => c.trim().startsWith('auth_token='))

  console.debug('[router guard]', { to: to.fullPath, initialized: initialized.value, isAuth: isAuthenticated.value, loggedIn, cookie: document.cookie })

  if (to.meta.requiresAuth && !loggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }
  if (to.meta.requiresGuest && loggedIn) {
    return next({ name: 'dashboard' })
  }
  next()
})

export default router
