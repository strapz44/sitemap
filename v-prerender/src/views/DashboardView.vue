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
        <span v-if="!analyzing" class="btn-icon">↻</span>
        <span v-else class="spinner"></span>
        {{ analyzing ? 'Analyse en cours...' : 'Analyser' }}
      </button>
    </div>

    <!-- Section Analytics Global -->
    <div class="dashboard-grid">
      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" v-for="kpi in globalKpis" :key="kpi.id">
          <div class="kpi-icon" :style="{ background: kpi.color }">
            {{ kpi.icon }}
          </div>
          <div class="kpi-content">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-value">{{ kpi.value }}</div>
            <div class="kpi-trend" :class="kpi.trendClass">
              {{ kpi.trend }}
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-section">
        <div class="chart-container">
          <h2 class="section-title">Trafic (7 jours)</h2>
          <canvas ref="trafficChart"></canvas>
          <div v-if="loading" class="loading">Chargement...</div>
        </div>

        <div class="chart-container">
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
          <div class="site-card" v-for="site in sitesOverview" :key="site.siteName">
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

      <!-- Sources Trafic -->
      <div class="sources-section">
        <div class="chart-container sources-chart">
          <h2 class="section-title">Sources de Trafic</h2>
          <canvas ref="sourcesChart"></canvas>
        </div>
        <div class="chart-container sources-detail">
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
import AnalyticsService from '../services/AnalyticsService'
import SitemapService from '../services/SitemapService'

const loading = ref(true)
const analyzing = ref(false)
const trafficChart = ref(null)
const sourcesChart = ref(null)
let chartInstance = null
let sourcesChartInstance = null
let refreshInterval = null

const topPages = ref([])
const sitesOverview = ref([])
const trafficSources = ref([])
const analysisHistory = ref([])

const globalKpis = computed(() => [
  {
    id: 'pageviews',
    label: 'Total Pageviews',
    value: totalStats.value.pageviews.toLocaleString('fr-FR'),
    icon: '▓',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    trend: '↑ 12% vs semaine',
    trendClass: 'trend-up'
  },
  {
    id: 'sessions',
    label: 'Sessions',
    value: totalStats.value.sessions.toLocaleString('fr-FR'),
    icon: '◆',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    trend: '↑ 8% vs semaine',
    trendClass: 'trend-up'
  },
  {
    id: 'visitors',
    label: 'Visiteurs Uniques',
    value: totalStats.value.visitors.toLocaleString('fr-FR'),
    icon: '●',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    trend: '↑ 5% vs semaine',
    trendClass: 'trend-up'
  },
  {
    id: 'bounce',
    label: 'Bounce Rate',
    value: (totalStats.value.bounceRate * 100).toFixed(1) + '%',
    icon: '▼',
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
    const [sitemaps, ] = await Promise.all([
      SitemapService.list(),
    ])

    // Charger les stats pour chaque site
    const now = new Date()
    const from = new Date(now.getTime() - 7*24*3600*1000).toISOString()
    const to = now.toISOString()

    if (Array.isArray(sitemaps) && sitemaps.length > 0) {
      const siteStats = await Promise.all(
        sitemaps.map(async site => {
          try {
            const [summary] = await Promise.all([
              AnalyticsService.summary(from, to, site.siteName),
              AnalyticsService.topPages(from, to, 5, site.siteName),
              AnalyticsService.timeseries(from, to, site.siteName)
            ])
            
            return {
              siteName: site.siteName,
              pageviews: summary.pageviews || 0,
              sessions: summary.sessions || 0,
              visitors: summary.visitors || 0,
              bounceRate: ((summary.bounce_rate || 0) * 100).toFixed(1) + '%',
              status: summary.pageviews > 0 ? 'active' : 'inactive',
              statusLabel: summary.pageviews > 0 ? 'Actif' : 'Inactif',
              lastUpdate: new Date().toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            }
          } catch (e) {
            return {
              siteName: site.siteName,
              pageviews: 0,
              sessions: 0,
              visitors: 0,
              bounceRate: '0%',
              status: 'error',
              statusLabel: 'Erreur',
              lastUpdate: 'N/A'
            }
          }
        })
      )

      sitesOverview.value = siteStats

      if (siteStats.length > 0) {
        const topPagesList = await AnalyticsService.topPages(from, to, 10, siteStats[0].siteName)
        topPages.value = Array.isArray(topPagesList.items) ? topPagesList.items : []
        const sources = await AnalyticsService.top('utm_source', from, to, 10, siteStats[0].siteName)
        trafficSources.value = Array.isArray(sources.items) ? sources.items : []
        try {
          const history = await AnalyticsService.getAnalysisHistory(siteStats[0].siteName, 10)
          analysisHistory.value = history.items || []
        } catch (e) {
          analysisHistory.value = []
        }
        await renderTrafficChart(from, to, siteStats[0].siteName)
        await renderSourcesChart()
      }
    }
  } catch (e) {
    console.error('Dashboard error:', e)
  } finally {
    loading.value = false
  }
}

async function renderTrafficChart(from, to, siteName) {
  try {
    const timeseries = await AnalyticsService.timeseries(from, to, siteName)
    const items = Array.isArray(timeseries.items) ? timeseries.items : []

    if (trafficChart.value && items.length > 0) {
      const { default: Chart } = await import('chart.js/auto')
      
      if (chartInstance) chartInstance.destroy()

      const labels = items.map(i => new Date(i.ts).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }))
      const pageviews = items.map(i => Number(i.pageviews || 0))
      const sessions = items.map(i => Number(i.sessions || 0))

      chartInstance = new Chart(trafficChart.value.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Pageviews',
              data: pageviews,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Sessions',
              data: sessions,
              borderColor: '#f5576c',
              backgroundColor: 'rgba(245, 87, 108, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: true, position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      })
    }
  } catch (e) {
    console.error('Traffic chart error:', e)
  }
}

async function renderSourcesChart() {
  try {
    if (trafficSources.value.length === 0) return

    if (sourcesChart.value) {
      const { default: Chart } = await import('chart.js/auto')
      
      if (sourcesChartInstance) sourcesChartInstance.destroy()

      const labels = trafficSources.value.map(s => s.name || 'Unknown')
      const data = trafficSources.value.map(s => Number(s.hits || 0))
      const colors = ['#667eea', '#f5576c', '#43e97b', '#4facfe', '#f093fb', '#667eea', '#f5576c', '#43e97b']

      sourcesChartInstance = new Chart(sourcesChart.value.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors.slice(0, labels.length),
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: true, position: 'right' }
          }
        }
      })
    }
  } catch (e) {
    console.error('Sources chart error:', e)
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
  padding: 6rem 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
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
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-analyze:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.btn-analyze:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1.1em;
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

.kpi-card {
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
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
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
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
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.site-card:hover {
  transform: translateY(-4px);
  border-color: #667eea;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.2);
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
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
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
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
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
</style>
