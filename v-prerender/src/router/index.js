import { createRouter, createWebHistory } from 'vue-router'
import SitemapView from '../views/SitemapView.vue'
import SitemapDetailsView from '../views/SitemapDetailsView.vue'
import DashboardView from '../views/DashboardView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'

const routes = [
  { path: '/', redirect: { name: 'dashboard' } },
  { path: '/sitemaps', name: 'home', component: SitemapView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView },
  { path: '/analytics', name: 'analytics', component: AnalyticsView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/sitemaps/:siteName(.*)', name: 'sitemap-details', component: SitemapDetailsView, props: true },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => { next() })

export default router
