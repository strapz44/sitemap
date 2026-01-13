// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

import { createRouter, createWebHistory } from 'vue-router'
import SitemapView from './views/SitemapView.vue'
import SitemapDetailsView from './views/SitemapDetailsView.vue'
import DashboardView from './views/DashboardView.vue'
import AnalyticsView from './views/AnalyticsView.vue'

const routes = [
  { path: '/', name: 'home', component: SitemapView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView },
  { path: '/analytics', name: 'analytics', component: AnalyticsView },
  { path: '/sitemaps/:siteName', name: 'sitemap-details', component: SitemapDetailsView, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
