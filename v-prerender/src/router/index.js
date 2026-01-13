import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SitemapView from '../views/SitemapView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/sitemap', name: 'sitemap', component: SitemapView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
