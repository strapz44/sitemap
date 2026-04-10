<template>
  <div class="page-container">
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="title">Vue d'ensemble</h1>
        <p class="subtitle">Analyse globale de vos sites et performance</p>
      </div>
      <button
        class="btn-analyze"
        :disabled="analyzing"
        @click="triggerAnalysis"
      >
        <span v-if="analyzing" class="spinner"></span>
        {{ analyzing ? 'Analyse en cours...' : 'Analyser' }}
      </button>
    </div>

    <!-- Skeleton loader -->
    <div v-if="loading" class="skeleton">
      <div class="skeleton-grid">
        <div class="skeleton-card" v-for="i in 4" :key="i"></div>
      </div>
      <div class="skeleton-row" style="height:280px"></div>
      <div class="skeleton-row" style="height:200px"></div>
    </div>

    <!-- Section Analytics Global -->
    <transition name="fade" appear>
    <div v-show="!loading" class="dashboard-grid">
      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card glass-card" v-for="kpi in globalKpis" :key="kpi.id">
          <div class="kpi-icon" :style="{ background: kpi.color }">
            <span v-html="kpi.icon"></span>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-value">
              <GradientCountUp v-if="kpi.countUp" :value="kpi.rawValue" :suffix="kpi.suffix" />
              <span v-else>{{ kpi.value }}</span>
            </div>
            <div class="kpi-trend" :class="kpi.trendClass">
              {{ kpi.trend }}
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-section">
        <div class="chart-container glass-card">
          <h2 class="section-title">Trafic (7 jours)</h2>
          <v-chart v-if="trafficOption" :option="trafficOption" autoresize style="height:280px" />
          <div v-if="!trafficOption && !loading" class="empty-state">Aucune donnée de trafic</div>
        </div>

        <div class="chart-container glass-card">
          <h2 class="section-title">Top Pages</h2>
          <div class="top-pages">
            <div class="top-page-item" v-for="(page, idx) in topPages" :key="idx">
              <div class="page-rank">{{ idx + 1 }}</div>
              <div class="page-info">
                <div class="page-path">{{ page.pathname }}</div>
                <div class="page-meta">{{ page.hits }} vues</div>
              </div>
              <div class="page-bar">
                <div class="bar-fill" :style="{ width: getBarWidth(page.hits, topPages[0]?.hits) + '%' }"></div>
              </div>
            </div>
            <div v-if="!topPages.length" class="empty-state">Aucune donnée disponible</div>
          </div>
        </div>
      </div>

      <!-- Détails Sites -->
      <div class="sites-section">
        <h2 class="section-title">Performances par Site</h2>
        <div class="sites-list">
          <div class="site-card glass-card glow-card glow-card--blue-pulse" v-for="site in sitesOverview" :key="site.siteName">
            <div class="site-header">
              <div class="site-name">{{ site.siteName }}</div>
              <span class="site-status" :class="site.status">{{ site.statusLabel }}</span>
            </div>
            <div class="site-stats">
              <div class="stat">
                <span class="stat-label">Vues</span>
                <span class="stat-value">{{ site.pageviews }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Sessions</span>
                <span class="stat-value">{{ site.sessions }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Visiteurs</span>
                <span class="stat-value">{{ site.visitors }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Bounce %</span>
                <span class="stat-value">{{ site.bounceRate }}</span>
              </div>
            </div>
            <div class="site-footer">
              <small>Mis à jour: {{ site.lastUpdate }}</small>
            </div>
          </div>
          <div v-if="!sitesOverview.length" class="empty-state">
            Ajoutez un site pour voir les statistiques
          </div>
        </div>
      </div>

      <!-- World Map -->
      <div class="map-section">
        <h2 class="section-title">Connectivité mondiale</h2>
        <div class="map-card glass-card">
          <WorldMap :api-base="apiBase" arc-color="#0ea5e9" dot-color="#6366f1" label-color="#64748b" />
        </div>
      </div>

      <!-- Sources Trafic -->
      <div class="sources-section">
        <div class="chart-container glass-card sources-chart">
          <h2 class="section-title">Sources de Trafic</h2>
          <v-chart v-if="sourcesOption" :option="sourcesOption" autoresize style="height:280px" />
        </div>
        <div class="chart-container glass-card sources-detail">
          <h2 class="section-title">Répartition</h2>
          <div class="sources-grid">
            <div class="source-item" v-for="source in trafficSources" :key="source.name">
              <div class="source-name">{{ source.name }}</div>
              <div class="source-value">{{ source.hits }}</div>
              <div class="source-bar">
                <div class="bar-fill" :style="{ width: getBarWidth(source.hits, trafficSources[0]?.hits) + '%' }"></div>
              </div>
            </div>
            <div v-if="!trafficSources.length" class="empty-state">Aucune donnée</div>
          </div>
        </div>
      </div>
    </div>
    </transition>

    <!-- Analysis History -->
    <div class="history-section" v-if="analysisHistory.length">
      <h2 class="section-title">Historique des Analyses</h2>
      <div class="history-table">
        <div class="history-header">
          <div class="col-date">Date</div>
          <div class="col-site">Site</div>
          <div class="col-status">Statut</div>
          <div class="col-details">Détails</div>
        </div>
        <div class="history-row" v-for="item in analysisHistory" :key="item.id">
          <div class="col-date">{{ formatDate(item.createdAt) }}</div>
          <div class="col-site">{{ item.siteName }}</div>
          <div class="col-status">
            <span class="badge" :class="'badge-' + item.status">{{ item.status }}</span>
          </div>
          <div class="col-details">
            <span v-if="item.status === 'completed'">+{{ item.pagesAdded }} pages ajoutées</span>
            <span v-else-if="item.status === 'failed'">{{ item.error }}</span>
            <span v-else>En cours...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import GradientCountUp from '../components/GradientCountUp.vue'
import AnalyticsService from '../services/AnalyticsService'
import SitemapService from '../services/SitemapService'
import WorldMap from '../components/WorldMap.vue'

use([CanvasRenderer, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent])

const apiBase = ''

const loading = ref(true)
const analyzing = ref(false)
let refreshInterval = null

const topPages = ref([])
const sitesOverview = ref([])
const trafficSources = ref([])
const analysisHistory = ref([])
const trafficOption = ref(null)
const sourcesOption = ref(null)

const globalKpis = computed(() => [
  {
    id: 'pageviews',
    label: 'Total Pageviews',
    value: totalStats.value.pageviews.toLocaleString('fr-FR'),
    rawValue: totalStats.value.pageviews,
    countUp: true,
    suffix: '',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    trend: '↑ 12% vs semaine',
    trendClass: 'trend-up'
  },
  {
    id: 'sessions',
    label: 'Sessions',
    value: totalStats.value.sessions.toLocaleString('fr-FR'),
    rawValue: totalStats.value.sessions,
    countUp: true,
    suffix: '',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    trend: '↑ 8% vs semaine',
    trendClass: 'trend-up'
  },
  {
    id: 'visitors',
    label: 'Visiteurs Uniques',
    value: totalStats.value.visitors.toLocaleString('fr-FR'),
    rawValue: totalStats.value.visitors,
    countUp: true,
    suffix: '',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    trend: '↑ 5% vs semaine',
    trendClass: 'trend-up'
  },
  {
    id: 'bounce',
    label: 'Bounce Rate',
    value: (totalStats.value.bounceRate * 100).toFixed(1) + '%',
    rawValue: null,
    countUp: false,
    suffix: '',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    trend: '↓ 2% (amélioration)',
    trendClass: 'trend-down'
  }
])

const totalStats = computed(() => {
  const stats = {
    pageviews: 0,
    sessions: 0,
    visitors: 0,
    bounceRate: 0
  }
  sitesOverview.value.forEach(site => {
    stats.pageviews += parseInt(site.pageviews) || 0
    stats.sessions += parseInt(site.sessions) || 0
    stats.visitors += parseInt(site.visitors) || 0
  })
  if (sitesOverview.value.length > 0) {
    stats.bounceRate = sitesOverview.value.reduce((sum, s) => sum + (parseFloat(s.bounceRate) || 0), 0) / sitesOverview.value.length / 100
  }
  return stats
})

function getBarWidth(value, max) {
  if (!max || max === 0) return 0
  return (value / max) * 100
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

async function loadDashboard() {
  loading.value = true
  try {
    const now = new Date()
    const from = new Date(now.getTime() - 7*24*3600*1000).toISOString()
    const to = now.toISOString()

    // Phase 1: Load sitemaps list (fast)
    let sitemaps = []
    try { sitemaps = await SitemapService.list() } catch (e) { sitemaps = [] }
    if (!Array.isArray(sitemaps) || sitemaps.length === 0) {
      loading.value = false
      return
    }

    const firstName = sitemaps[0].siteName

    // Phase 2: Fire ALL requests in parallel — don't wait for one before the next
    const [siteStatsResults, topPagesList, sourcesData, tsData, historyData] = await Promise.allSettled([
      // Site summaries in parallel
      Promise.all(sitemaps.map(site =>
        AnalyticsService.summary(from, to, site.siteName)
          .then(summary => ({
            siteName: site.siteName,
            pageviews: summary.pageviews || 0,
            sessions: summary.sessions || 0,
            visitors: summary.visitors || 0,
            bounceRate: ((summary.bounce_rate || 0) * 100).toFixed(1) + '%',
            status: summary.pageviews > 0 ? 'active' : 'inactive',
            statusLabel: summary.pageviews > 0 ? 'Actif' : 'Inactif',
            lastUpdate: new Date().toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          }))
          .catch(() => ({
            siteName: site.siteName, pageviews: 0, sessions: 0, visitors: 0,
            bounceRate: '0%', status: 'error', statusLabel: 'Erreur', lastUpdate: 'N/A'
          }))
      )),
      // Top pages
      AnalyticsService.topPages(from, to, 10, firstName).catch(() => ({ items: [] })),
      // Sources
      AnalyticsService.top('utm_source', from, to, 10, firstName).catch(() => ({ items: [] })),
      // Timeseries
      AnalyticsService.timeseries(from, to, firstName).catch(() => ({ items: [] })),
      // History
      AnalyticsService.getAnalysisHistory(firstName, 10).catch(() => ({ items: [] })),
    ])

    // Phase 3: Populate data as it arrives — loading false ASAP
    loading.value = false

    if (siteStatsResults.status === 'fulfilled') sitesOverview.value = siteStatsResults.value
    if (topPagesList.status === 'fulfilled') topPages.value = Array.isArray(topPagesList.value.items) ? topPagesList.value.items : []
    if (sourcesData.status === 'fulfilled') trafficSources.value = Array.isArray(sourcesData.value.items) ? sourcesData.value.items : []
    if (historyData.status === 'fulfilled') analysisHistory.value = historyData.value.items || []

    // Phase 4: Render charts from the parallel-fetched data
    if (tsData.status === 'fulfilled') {
      const items = Array.isArray(tsData.value.items) ? tsData.value.items : []
      buildTrafficChart(items)
    }
    renderSourcesChart()
  } catch (e) {
    console.error('Dashboard error:', e)
    loading.value = false
  }
}

function buildTrafficChart(items) {
  if (!items || items.length === 0) return
  const labels = items.map(i => new Date(i.ts).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }))
  const pageviews = items.map(i => Number(i.pageviews || 0))
  const sessions = items.map(i => Number(i.sessions || 0))

  trafficOption.value = {
    tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          textStyle: { color: '#334155', fontSize: 12 },
        },
        legend: {
          data: ['Pageviews', 'Sessions'],
          bottom: 0,
          textStyle: { color: '#64748b' },
          icon: 'roundRect',
        },
        grid: { top: 10, right: 16, bottom: 40, left: 50, containLabel: false },
        xAxis: {
          type: 'category',
          data: labels,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
        },
        series: [
          {
            name: 'Pageviews',
            type: 'line',
            data: pageviews,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2.5, color: '#667eea' },
            itemStyle: { color: '#667eea' },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(102,126,234,0.35)' },
                  { offset: 1, color: 'rgba(102,126,234,0.02)' },
                ],
              },
            },
          },
          {
            name: 'Sessions',
            type: 'line',
            data: sessions,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2.5, color: '#f5576c' },
            itemStyle: { color: '#f5576c' },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(245,87,108,0.30)' },
                  { offset: 1, color: 'rgba(245,87,108,0.02)' },
                ],
              },
            },
          },
        ],
      }
}

function renderSourcesChart() {
  if (trafficSources.value.length === 0) return

  const labels = trafficSources.value.map(s => s.name || 'Unknown')
    const data = trafficSources.value.map((s, i) => ({
      name: labels[i],
      value: Number(s.hits || 0),
    }))
    const colors = ['#667eea', '#f5576c', '#43e97b', '#4facfe', '#f093fb', '#fbbf24', '#34d399', '#a78bfa']

    sourcesOption.value = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: '#64748b', fontSize: 12 },
        icon: 'circle',
      },
      color: colors,
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: true,
          padAngle: 3,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
          },
          data,
        },
      ],
    }
}

async function triggerAnalysis() {
  if (analyzing.value || !sitesOverview.value.length) return
  analyzing.value = true
  try {
    const siteName = sitesOverview.value[0].siteName
    await AnalyticsService.analyze(siteName)
    setTimeout(() => { loadDashboard() }, 2000)
  } catch (e) {
    console.error('Analysis error:', e)
  } finally {
    analyzing.value = false
  }
}

onMounted(() => {
  loadDashboard()
  refreshInterval = setInterval(loadDashboard, 60000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.page-container {
  padding: 88px 24px 120px;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdfa 100%);
  min-height: 100vh;
}

/* ── Glassmorphism card ─────────────────────────────────── */
.glass-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.5);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.glass-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.6);
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1.5rem;
}

.header-content {
  flex: 1;
}

.title {
  color: #1a202c;
  font-weight: 800;
  font-size: 2rem;
  margin: 0 0 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #4a5568;
  font-size: 0.95rem;
  margin: 0;
}

.btn-analyze {
  --green: #1BFD9C;
  font-size: 15px;
  padding: 0.7em 2.7em;
  letter-spacing: 0.06em;
  position: relative;
  font-family: inherit;
  border-radius: 0.6em;
  overflow: hidden;
  transition: all 0.3s;
  line-height: 1.4em;
  border: 2px solid var(--green);
  background: linear-gradient(to right, rgba(27, 253, 156, 0.1) 1%, transparent 40%, transparent 60%, rgba(27, 253, 156, 0.1) 100%);
  color: var(--green);
  box-shadow: inset 0 0 10px rgba(27, 253, 156, 0.4), 0 0 9px 3px rgba(27, 253, 156, 0.1);
  cursor: pointer;
  font-weight: 600;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-analyze:hover:not(:disabled) {
  color: #82ffc9;
  box-shadow: inset 0 0 10px rgba(27, 253, 156, 0.6), 0 0 9px 3px rgba(27, 253, 156, 0.2);
}

.btn-analyze::before {
  content: "";
  position: absolute;
  left: -4em;
  width: 4em;
  height: 100%;
  top: 0;
  transition: transform .4s ease-in-out;
  background: linear-gradient(to right, transparent 1%, rgba(27, 253, 156, 0.1) 40%, rgba(27, 253, 156, 0.1) 60%, transparent 100%);
}

.btn-analyze:hover::before {
  transform: translateX(15em);
}

.btn-analyze:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Requis pour positionner les météores */
.meteor-section {
  position: relative;
  overflow: hidden;
}

.kpi-card {
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.kpi-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.kpi-content {
  flex: 1;
}

.kpi-label {
  color: #718096;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  color: #1a202c;
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0.3rem 0;
}

.kpi-trend {
  font-size: 0.8rem;
  color: #48bb78;
  font-weight: 600;
}

.kpi-trend.trend-down {
  color: #f56565;
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.chart-container {
  border-radius: 16px;
  padding: 1.5rem;
}

.section-title {
  color: #1a202c;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #edf2f7;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #718096;
  font-size: 0.9rem;
}

/* Top Pages */
.top-pages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top-page-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f7fafc;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.top-page-item:hover {
  background: #edf2f7;
}

.page-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.page-info {
  flex: 1;
  min-width: 0;
}

.page-path {
  color: #1a202c;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-meta {
  color: #718096;
  font-size: 0.8rem;
  margin-top: 0.2rem;
}

.page-bar {
  width: 60px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

/* Sites Section */
.sites-section {
  grid-column: 1 / -1;
}

.sites-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.site-card {
  border-radius: 16px;
  padding: 1.5rem;
  /* border retiré — géré par glow-card::before */
}

.site-card:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.15);
}

.site-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.site-name {
  color: #1a202c;
  font-weight: 700;
  font-size: 0.95rem;
  word-break: break-word;
}

.site-status {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.site-status.active {
  background: #c6f6d5;
  color: #22543d;
}

.site-status.inactive {
  background: #fed7d7;
  color: #742a2a;
}

.site-status.error {
  background: #feebc8;
  color: #7c2d12;
}

.site-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
}

.stat {
  text-align: center;
}

.stat-label {
  color: #718096;
  font-size: 0.75rem;
  font-weight: 600;
  display: block;
  margin-bottom: 0.3rem;
}

.stat-value {
  color: #1a202c;
  font-size: 1.2rem;
  font-weight: 800;
  display: block;
}

.site-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.75rem;
  color: #a0aec0;
  font-size: 0.75rem;
}

/* Sources Section */
.sources-section {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.sources-chart {
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.sources-chart canvas {
  flex: 1;
}

.sources-detail {
  overflow-y: auto;
  max-height: 400px;
}

.sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.source-item {
  background: rgba(255,255,255,0.5);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(8px);
}

.source-name {
  color: #1a202c;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.source-value {
  color: #667eea;
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.source-bar {
  width: 100%;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

/* History Section */
.history-section {
  grid-column: 1 / -1;
}

.history-table {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.history-header,
.history-row {
  display: grid;
  grid-template-columns: 150px 1fr 100px 1fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
}

.history-header {
  background: #f7fafc;
  font-weight: 700;
  color: #4a5568;
  font-size: 0.85rem;
}

.history-row:last-child {
  border-bottom: none;
}

.col-date {
  color: #718096;
  font-size: 0.9rem;
}

.col-site {
  color: #1a202c;
  font-weight: 600;
}

.col-status {
  text-align: center;
}

.col-details {
  color: #718096;
  font-size: 0.85rem;
}

.badge {
  padding: 0.3rem 0.7rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge-completed {
  background: #c6f6d5;
  color: #22543d;
}

.badge-failed {
  background: #fed7d7;
  color: #742a2a;
}

.badge-pending {
  background: #bee3f8;
  color: #2c5282;
}

/* Map Section */
.map-section {
  grid-column: 1 / -1;
}

.map-card {
  border-radius: 16px;
  padding: 1.5rem;
  overflow: hidden;
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  color: #718096;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .page-container {
    padding: 5rem 1rem 1rem;
  }

  .dashboard-header {
    flex-direction: column;
  }

  .title {
    font-size: 1.5rem;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .sites-list,
  .sources-grid {
    grid-template-columns: 1fr;
  }

  .history-header,
  .history-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }
}

/* ── Skeleton loader ──────────────────────────────── */
.skeleton { display: grid; gap: 1.5rem; }
.skeleton-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
.skeleton-card { height: 110px; border-radius: 16px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease infinite; }
.skeleton-row { border-radius: 16px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease infinite; }
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

/* ── Fade transition ──────────────────────────────── */
.fade-enter-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.fade-enter-from { opacity: 0; transform: translateY(12px); }
</style>
