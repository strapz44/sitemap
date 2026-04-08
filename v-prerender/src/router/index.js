import { createRouter, createWebHistory } from 'vue-router'

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

function isAuthenticated() {
  // Check for auth_token cookie
  return document.cookie.split(';').some(c => c.trim().startsWith('auth_token='))
}

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }
  if (to.meta.requiresGuest && isAuthenticated()) {
    return next({ name: 'dashboard' })
  }
  next()
})

export default router
