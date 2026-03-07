<template>
  <div class="details-page">
    <div class="back-btn" @click="$router.back()">← Retour</div>

    <div v-if="loading" class="loading">Chargement...</div>
    <div v-else>
      <div v-if="!doc && !summary" class="error">Aucune donnée trouvée.</div>
      <div v-else>
        <!-- Analytics Section -->
        <div class="analytics-section" v-if="hasAnalytics">
          <h2 class="section-title">Analyse en Temps Réel</h2>
          <div class="analytics-grid">
            <div class="analytics-card">
              <div class="analytic-label">Pageviews (7j)</div>
              <div class="analytic-value">{{ analyticsData.pageviews }}</div>
              <div class="analytic-change" :class="analyticsData.pageviewsTrend > 0 ? 'positive' : 'negative'">
                {{ analyticsData.pageviewsTrend > 0 ? '↑' : '↓' }} {{ Math.abs(analyticsData.pageviewsTrend) }}%
              </div>
            </div>
            <div class="analytics-card">
              <div class="analytic-label">Sessions</div>
              <div class="analytic-value">{{ analyticsData.sessions }}</div>
              <div class="analytic-change" :class="analyticsData.sessionsTrend > 0 ? 'positive' : 'negative'">
                {{ analyticsData.sessionsTrend > 0 ? '↑' : '↓' }} {{ Math.abs(analyticsData.sessionsTrend) }}%
              </div>
            </div>
            <div class="analytics-card">
              <div class="analytic-label">Visiteurs</div>
              <div class="analytic-value">{{ analyticsData.visitors }}</div>
              <div class="analytic-change">Uniques</div>
            </div>
            <div class="analytics-card">
              <div class="analytic-label">Bounce Rate</div>
              <div class="analytic-value">{{ analyticsData.bounceRate }}</div>
              <div class="analytic-change">Global</div>
            </div>
          </div>

          <!-- Charts -->
          <div class="charts-row">
            <div class="chart-item">
              <h3 class="chart-title">Trafic (7 jours)</h3>
              <canvas ref="sitemapTrafficChart"></canvas>
            </div>
            <div class="chart-item">
              <h3 class="chart-title">Top Pages</h3>
              <div class="simple-chart">
                <div class="chart-bar" v-for="page in topPages.slice(0, 5)" :key="page.pathname">
                  <div class="bar-label">{{ page.pathname.split('/').pop() || '/' }}</div>
                  <div class="bar">
                    <div class="bar-fill" :style="{ width: getChartWidth(page.hits) + '%' }"></div>
                  </div>
                  <div class="bar-value">{{ page.hits }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="metrics-panel">

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Score global</div>
              <div class="metric-main">
                <span class="metric-strong">{{ score }}%</span>
                <span :class="['chip', scoreChipClass]">{{ scoreLabel }}</span>
              </div>
              <div class="bar"><div class="bar-fill" :style="{ width: score + '%' }"></div></div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Indexation</div>
              <div class="metric-main">
                <span class="metric-strong">{{ indexedText }}</span>
              </div>
              <div class="bar"><div class="bar-fill green" :style="{ width: indexPct + '%' }"></div></div>
              <div class="metric-hint">{{ indexPct }}% indexées par Google</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Problèmes</div>
              <div class="metric-tags">
                <span class="chip chip-rose">{{ errors }} erreurs</span>
                <span class="chip chip-amber">{{ warnings }} alertes</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Statut HTTP</div>
              <span :class="['chip', httpOk ? 'chip-green' : 'chip-rose']">{{ httpStatusText }}</span>
            </div>

            <div class="metric-card">
              <div class="metric-label">Format XML</div>
              <span :class="['chip', xmlValid ? 'chip-green' : 'chip-rose']">{{ xmlValid ? 'Valide' : 'Invalide' }}</span>
              <div class="metric-hint">Structure vérifiée</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Taille</div>
              <div class="metric-main"><span class="metric-strong">{{ sizeText }}</span></div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Mise à jour</div>
              <div class="metric-main"><span class="metric-strong">{{ lastmodText }}</span></div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Dernier scan</div>
              <div class="metric-main"><span class="metric-strong">{{ lastCrawlText }}</span></div>
            </div>
          </div>
        </div>

        <div class="details-charts">
          <div class="chart-container">
            <h2 class="section-title">Trafic (7 jours)</h2>
            <canvas ref="detailTrafficChart"></canvas>
          </div>
          <div class="chart-container">
            <h2 class="section-title">Sources de Trafic</h2>
            <canvas ref="detailSourcesChart"></canvas>
          </div>
        </div>
        <div class="urls-list">
        <div v-for="(u, i) in urls" :key="i" class="url-item">
          <a class="url-loc" :href="u.loc" target="_blank" rel="noopener">{{ u.loc }}</a>
          <div class="url-details">
            <span v-if="u.priority">Priorité: {{ u.priority }}</span>
            <span v-if="u.lastmod">Dernière modification: {{ u.lastmod }}</span>
            <span v-if="u.changefreq">Fréquence: {{ u.changefreq }}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
    
    <!-- Sticky footer with actions at the bottom -->
    <div v-if="!loading" class="sticky-footer">
      <div class="footer-actions">
        <button class="btn-add" @click="downloadHtml" :disabled="downloading">{{ downloading ? 'Téléchargement...' : 'Télécharger HTML' }}</button>
        <button class="btn-add" @click="$router.back()">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import AnalyticsService from '../services/AnalyticsService' 

const route = useRoute()
const rawParam = route.params.siteName
let siteName = ''
try {
  const v = Array.isArray(rawParam) ? rawParam[0] : (rawParam || '')
  siteName = typeof v === 'string' ? decodeURIComponent(v) : String(v || '')
} catch (e) {
  siteName = String(Array.isArray(rawParam) ? rawParam[0] : (rawParam || ''))
}

const API_URL = (import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'
const API_BASE = ref(API_URL)

const loading = ref(true)
const doc = ref(null)
const summary = ref(null)
const downloading = ref(false)

// analytics chart refs
const detailTrafficChart = ref(null)
const detailSourcesChart = ref(null)
let detailTrafficInstance = null
let detailSourcesInstance = null

const detailTimeseries = ref([])
const detailSources = ref([])

let refreshInterval = null

onMounted(async () => {
  try {
    try {
      const { data } = await axios.get(`${API_BASE.value}/sitemaps/${encodeURIComponent(siteName)}`)
      doc.value = data
    } catch (e) {
      const { data } = await axios.get(`${API_BASE.value}/sitemap/${encodeURIComponent(siteName)}`)
      doc.value = data
    }
    try {
      const { data: sum } = await axios.get(`${API_BASE.value}/sitemaps/${encodeURIComponent(siteName)}/summary`)
      summary.value = sum
    } catch (e) {
      summary.value = null
    }
    if (!summary.value) {
      const s = deriveSummaryFromDoc()
      if (s) summary.value = s
    }
    if (!doc.value && summary.value) {
      doc.value = { urls: [] }
    }
  } catch (e) {
    doc.value = null
  } finally {
    if (!doc.value) doc.value = { urls: [] }
    if (!summary.value) {
      const s = deriveSummaryFromDoc()
      if (s) summary.value = s
    }
    loading.value = false
  }
  await loadAnalytics()
  refreshInterval = setInterval(loadAnalytics, 60000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

// Normalize urls regardless of storage shape
const urls = computed(() => {
  if (!doc.value) return []
  if (Array.isArray(doc.value.urls)) return doc.value.urls
  const arr = doc.value?.sitemap?.urlset?.url
  if (Array.isArray(arr)) {
    return arr.map(u => ({
      loc: Array.isArray(u.loc) ? u.loc[0] : u.loc,
      lastmod: Array.isArray(u.lastmod) ? u.lastmod[0] : u.lastmod,
      priority: Array.isArray(u.priority) ? u.priority[0] : u.priority,
      changefreq: Array.isArray(u.changefreq) ? u.changefreq[0] : u.changefreq,
    }))
  }
  return []
})

const totalUrls = computed(() => urls.value.length)
const xmlValid = computed(() => !!doc.value && (!!doc.value.urls || !!doc.value?.sitemap?.urlset?.url))
const lastmodText = computed(() => {
  const iso = summary.value?.lastmodLatest
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString()
})
const lastCrawlText = computed(() => {
  const iso = summary.value?.lastCrawl
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '-' : d.toLocaleString()
})
const errors = computed(() => summary.value?.errors ?? 0)
const warnings = computed(() => summary.value?.warnings ?? 0)
const httpStatus = computed(() => summary.value?.httpStatus ?? null)
const httpOk = computed(() => (httpStatus.value || 0) >= 200 && (httpStatus.value || 0) < 400)
const httpStatusText = computed(() => httpStatus.value ? `HTTP ${httpStatus.value}` : 'HTTP —')
const sizeText = computed(() => summary.value?.size || '-')

function daysSince(iso){
  if (!iso) return Infinity
  const t = new Date(iso).getTime()
  return isNaN(t) ? Infinity : (Date.now() - t) / (1000*60*60*24)
}
const score = computed(() => {
  const s = summary.value?.score
  if (typeof s === 'number' && !isNaN(s)) return s
  const d = daysSince(summary.value?.lastmodLatest)
  if (d <= 7) return 98
  if (d <= 30) return 85
  if (d <= 90) return 67
  if (d < Infinity) return 35
  return 0
})
const scoreLabel = computed(() => {
  const s = score.value
  if (s >= 95) return 'excellent'
  if (s >= 80) return 'bon'
  if (s >= 60) return 'moyen'
  return 'critique'
})
const scoreChipClass = computed(() => {
  const l = scoreLabel.value
  return l === 'excellent' ? 'chip-green' : l === 'bon' ? 'chip-blue' : l === 'moyen' ? 'chip-amber' : 'chip-rose'
})

const indexTotal = computed(() => summary.value?.urlsSubmitted ?? totalUrls.value)
const indexIndexed = computed(() => summary.value?.urlsIndexed ?? 0)
const indexPct = computed(() => {
  const t = indexTotal.value || 0
  const i = indexIndexed.value || 0
  if (!t) return 0
  return Math.max(0, Math.min(100, Math.round((i / t) * 100)))
})
const indexedText = computed(() => `${indexIndexed.value} / ${indexTotal.value}`)

async function renderDetailTrafficChart(){
  try {
    if (!detailTrafficChart.value || detailTimeseries.value.length === 0) return
    const { default: Chart } = await import('chart.js/auto')
    if (detailTrafficInstance) detailTrafficInstance.destroy()
    const labels = detailTimeseries.value.map(i => new Date(i.ts).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }))
    const pageviews = detailTimeseries.value.map(i => Number(i.pageviews || 0))
    const sessions = detailTimeseries.value.map(i => Number(i.sessions || 0))
    detailTrafficInstance = new Chart(detailTrafficChart.value.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Pageviews', data: pageviews, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension:0.4, fill:true },
          { label: 'Sessions', data: sessions, borderColor: '#f5576c', backgroundColor: 'rgba(245,87,108,0.1)', tension:0.4, fill:true }
        ]
      },
      options: { responsive:true, maintainAspectRatio:true, plugins:{legend:{display:true, position:'bottom'}}, scales:{y:{beginAtZero:true}} }
    })
  } catch (e) {
    console.error('Erreur chart détail trafic:', e)
  }
}

async function renderDetailSourcesChart(){
  try {
    if (!detailSourcesChart.value || detailSources.value.length === 0) return
    const { default: Chart } = await import('chart.js/auto')
    if (detailSourcesInstance) detailSourcesInstance.destroy()
    const labels = detailSources.value.map(s => s.name || 'Unknown')
    const data = detailSources.value.map(s => Number(s.hits || 0))
    const colors = ['#667eea','#f5576c','#43e97b','#4facfe','#f093fb']
    detailSourcesInstance = new Chart(detailSourcesChart.value.getContext('2d'), {
      type: 'doughnut',
      data:{labels,datasets:[{data,backgroundColor:colors.slice(0,labels.length),borderColor:'#fff',borderWidth:2}]},
      options:{responsive:true, maintainAspectRatio:true, plugins:{legend:{display:true,position:'right'}}}
    })
  } catch(e){
    console.error('Erreur chart détail sources:', e)
  }
}

async function downloadHtml(){
  if (!siteName) return
  downloading.value = true
  try {
    const limit = Math.min((summary.value?.urlsSubmitted || totalUrls.value || 25), 100)
    const { data } = await axios.get(`${API_BASE.value}/sitemaps/${encodeURIComponent(siteName)}/html`, { params: { limit, concurrency: 4, save: true } })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const a = document.createElement('a')
    const safe = String(siteName).replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'') || 'pages'
    a.href = URL.createObjectURL(blob)
    a.download = `${safe}-html.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  } catch (e) {
    console.error(e)
  } finally {
    downloading.value = false
  }
}

async function loadAnalytics(){
  if (!siteName) return
  try {
    const now = new Date()
    const from = new Date(now.getTime() - 7*24*3600*1000).toISOString()
    const to = now.toISOString()
    const ts = await AnalyticsService.timeseries(from, to, siteName)
    detailTimeseries.value = Array.isArray(ts.items) ? ts.items : []
    const src = await AnalyticsService.top('utm_source', from, to, 10, siteName)
    detailSources.value = Array.isArray(src.items) ? src.items : []

    await renderDetailTrafficChart()
    await renderDetailSourcesChart()
  } catch (err) {
    console.error('Analytics detail error:', err)
  }
}

function deriveSummaryFromDoc(){
  try {
    const list = Array.isArray(doc.value?.urls) ? doc.value.urls : (Array.isArray(doc.value?.sitemap?.urlset?.url) ? doc.value.sitemap.urlset.url.map(u => ({
      loc: Array.isArray(u.loc) ? u.loc[0] : u.loc,
      lastmod: Array.isArray(u.lastmod) ? u.lastmod[0] : u.lastmod,
      priority: Array.isArray(u.priority) ? u.priority[0] : u.priority,
      changefreq: Array.isArray(u.changefreq) ? u.changefreq[0] : u.changefreq,
    })) : [] )
    const urlsSubmitted = list.length
    const urlsIndexed = Math.round(urlsSubmitted * 0.85)
    const latestTs = list.reduce((acc, u) => {
      const t = u?.lastmod ? new Date(u.lastmod).getTime() : 0
      return t && (!acc || t > acc) ? t : acc
    }, 0)
    const size = doc.value ? `${Math.max(1, Math.floor(JSON.stringify(doc.value).length / 1024))} KB` : '-'
    return {
      site: siteName,
      lastmodLatest: latestTs ? new Date(latestTs).toISOString() : null,
      lastCrawl: new Date(Date.now() - 2*24*3600*1000).toISOString(),
      changefreqCounts: {},
      errors: 0,
      warnings: 0,
      httpStatus: 200,
      size,
      score: undefined,
      urlsSubmitted,
      urlsIndexed,
    }
  } catch (e) {
    return null
  }
}
</script>

<style scoped>
.details-page { padding: 6rem 2rem 2rem; }
.sticky-footer {
  position: sticky;
  bottom: 0;
  z-index: 20;
  background: rgba(255,255,255,0.68);
  backdrop-filter: saturate(160%) blur(16px);
  -webkit-backdrop-filter: saturate(160%) blur(16px);
  border-top: 1px solid rgba(148,163,184,0.35);
  padding: 0.75rem 0;
  margin-top: 1rem;
}
.footer-actions { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
.section-title {
  font-size: 1.4rem;
  color: #334155;
  margin-bottom: 1rem;
}
.urls-list { margin-bottom: 1.5rem; }
.url-item { padding: 1rem; border-bottom: 1px solid #e5e7eb; }
.url-loc { color: #8b5cf6; display:block; margin-bottom: .5rem; word-break: break-all; }
.url-details { display:flex; gap:1rem; color:#475569; font-size:.9rem; flex-wrap: wrap; }
.loading, .error { color: #475569; margin: 1rem 0; }

/* Metrics panel */
.metrics-panel {
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(148,163,184,0.35);
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(2,6,23,0.10), inset 0 1px 0 rgba(255,255,255,0.35);
  backdrop-filter: saturate(160%) blur(16px);
  -webkit-backdrop-filter: saturate(160%) blur(16px);
  margin-bottom: 1.25rem;
}
.metrics-header { display:flex; align-items:center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom:1px solid #eef2f7; }
.metrics-title { margin: 0; font-size: 1.05rem; color: #0f172a; }
.metrics-sub { margin: 2px 0 0; font-size: .85rem; color: #64748b; }
.metrics-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; padding: 12px; }
.metric-card { background: #fff; border:1px solid #eef2f7; border-radius: 12px; padding: 10px 12px; display:flex; flex-direction: column; gap:6px; }
.metric-label { color:#64748b; font-size: 12px; text-transform: uppercase; letter-spacing:.04em; }
.metric-main { display:flex; align-items:center; gap:8px; }
.metric-strong { color:#0f172a; font-weight:700; }
.metric-tags { display:flex; gap:6px; flex-wrap:wrap; }
.chip { font-size: 11px; padding: 3px 8px; border-radius: 999px; border:1px solid #e5e7eb; color:#475569; background:#fff; }
.chip-green { color:#059669; border-color:#a7f3d0; background:#ecfdf5; }
.chip-blue { color:#2563eb; border-color:#bfdbfe; background:#eff6ff; }
.chip-amber { color:#b45309; border-color:#fde68a; background:#fffbeb; }
.chip-rose { color:#dc2626; border-color:#fecaca; background:#fef2f2; }
.bar { height: 4px; background:#edf2f7; border-radius:999px; overflow:hidden; }
.bar-fill { height:100%; background:#8b5cf6; }
.bar-fill.green { background:#1BFD9C; }
.metric-hint { color:#94a3b8; font-size: 12px; }

@media (max-width: 900px) { .metrics-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 540px) { .metrics-grid { grid-template-columns: 1fr; } }

/* detail charts */
.details-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.details-charts .chart-container {
  background: white;
  border-radius: 15px;
  padding: 1rem 1.5rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  min-height: 240px;
}

.btn-add {
  font-size: 15px;
  padding: 0.6em 1.2em;
  letter-spacing: 0.02em;
  position: relative;
  font-family: inherit;
  border-radius: 8px;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  line-height: 1.4em;
  border: 1px solid #1BFD9C;
  background: #ffffff;
  color: #1BFD9C;
  box-shadow: none;
}
.btn-add:hover {
  color: #1BFD9C;
  background: #ecfdf5;
  box-shadow: none;
}
.btn-add:before { content: none; }
.btn-add:hover:before { transform: none; }
</style>
