<template>
  <div class="page-container">
    <div class="header">
      <h1 class="title">Analytics</h1>
      <div class="filters">
        <button class="range-btn" :class="{ active: range==='7d' }" @click="setRange('7d')">7 j</button>
        <button class="range-btn" :class="{ active: range==='30d' }" @click="setRange('30d')">30 j</button>
        <button class="range-btn" :class="{ active: range==='90d' }" @click="setRange('90d')">90 j</button>
      </div>
    </div>

    <div v-if="loading" class="skeleton">
      <div class="skeleton-row"></div>
      <div class="skeleton-grid">
        <div class="skeleton-card" v-for="i in 4" :key="i"></div>
      </div>
      <div class="skeleton-card" style="height:260px"></div>
    </div>

    <transition name="fade" appear>
    <div v-if="!loading">
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">Pageviews</div>
          <div class="kpi-value"><GradientCountUp :value="summary.pageviews" /></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Sessions</div>
          <div class="kpi-value"><GradientCountUp :value="summary.sessions" /></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Visiteurs</div>
          <div class="kpi-value"><GradientCountUp :value="summary.visitors" /></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Bounce rate</div>
          <div class="kpi-value">{{ (summary.bounce_rate * 100).toFixed(1) }}%</div>
        </div>
      </div>

      <div class="charts">
        <div class="chart-card">
          <h2 class="chart-title">Trafic ({{ rangeLabel }})</h2>
          <v-chart v-if="tsOption" :option="tsOption" autoresize style="height:260px" />
          <div v-if="!timeseries.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Top pages ({{ rangeLabel }})</h2>
          <v-chart v-if="topPagesOption" :option="topPagesOption" autoresize style="height:260px" />
          <div v-if="!topPages.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Référents (domaines)</h2>
          <v-chart v-if="refOption" :option="refOption" autoresize style="height:260px" />
          <div v-if="!referrers.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Sources (utm_source)</h2>
          <v-chart v-if="srcOption" :option="srcOption" autoresize style="height:260px" />
          <div v-if="!sources.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Appareils</h2>
          <v-chart v-if="devOption" :option="devOption" autoresize style="height:260px" />
          <div v-if="!devices.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Navigateurs</h2>
          <v-chart v-if="brOption" :option="brOption" autoresize style="height:260px" />
          <div v-if="!browsers.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Systèmes</h2>
          <v-chart v-if="osOption" :option="osOption" autoresize style="height:260px" />
          <div v-if="!oses.length" class="empty">Aucune donnée</div>
        </div>
      </div>
    </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import axios from 'axios'
import GradientCountUp from '../components/GradientCountUp.vue'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

const loading = ref(true)
const summary = ref({ pageviews: 0, sessions: 0, visitors: 0, bounces: 0, bounce_rate: 0 })

const range = ref('7d')
const rangeLabel = computed(() => range.value === '7d' ? '7 jours' : range.value === '30d' ? '30 jours' : '90 jours')

const timeseries = ref([])
const topPages = ref([])
const referrers = ref([])
const sources = ref([])
const devices = ref([])
const browsers = ref([])
const oses = ref([])

const tsOption = ref(null)
const topPagesOption = ref(null)
const refOption = ref(null)
const srcOption = ref(null)
const devOption = ref(null)
const brOption = ref(null)
const osOption = ref(null)

const GRADIENT_COLORS = ['#667eea', '#f5576c', '#43e97b', '#4facfe', '#f093fb', '#fbbf24', '#a78bfa', '#34d399']

function setRange(v) {
  if (range.value !== v) {
    range.value = v
    load()
  }
}

function computeWindow() {
  const now = new Date()
  let days = 7
  if (range.value === '30d') days = 30
  if (range.value === '90d') days = 90
  const to = now.toISOString()
  const from = new Date(now.getTime() - days*24*3600*1000).toISOString()
  return { from, to }
}

function makeBarOption(items, color) {
  const labels = items.map(i => i.name || 'Unknown')
  const data = items.map(i => Number(i.hits || 0))
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#334155', fontSize: 12 },
    },
    grid: { top: 8, right: 16, bottom: 4, left: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
    yAxis: { type: 'category', data: labels, axisLabel: { color: '#334155', fontSize: 11 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    series: [{
      type: 'bar',
      data,
      barWidth: '55%',
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: color },
            { offset: 1, color: color + '88' },
          ],
        },
      },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.12)' } },
    }],
  }
}

async function load() {
  loading.value = true
  try {
    const { from, to } = computeWindow()
    const [sum, top, ts, r1, r2, r3, r4, r5] = await Promise.all([
      axios.get(`/api/analytics/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(r => r.data),
      axios.get(`/api/analytics/top-pages?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=10`).then(r => r.data),
      axios.get(`/api/analytics/timeseries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(r => r.data),
      axios.get(`/api/analytics/top?by=referrer_domain&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=10`).then(r => r.data),
      axios.get(`/api/analytics/top?by=utm_source&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=10`).then(r => r.data),
      axios.get(`/api/analytics/top?by=device&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=10`).then(r => r.data),
      axios.get(`/api/analytics/top?by=browser&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=10`).then(r => r.data),
      axios.get(`/api/analytics/top?by=os&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=10`).then(r => r.data),
    ])
    summary.value = sum
    topPages.value = Array.isArray(top.items) ? top.items : []
    timeseries.value = Array.isArray(ts.items) ? ts.items : []
    referrers.value = Array.isArray(r1.items) ? r1.items : []
    sources.value = Array.isArray(r2.items) ? r2.items : []
    devices.value = Array.isArray(r3.items) ? r3.items : []
    browsers.value = Array.isArray(r4.items) ? r4.items : []
    oses.value = Array.isArray(r5.items) ? r5.items : []

    renderAll()
  } catch (e) {
    summary.value = { pageviews: 0, sessions: 0, visitors: 0, bounces: 0, bounce_rate: 0 }
    topPages.value = []
    timeseries.value = []
    referrers.value = []
    sources.value = []
    devices.value = []
    browsers.value = []
    oses.value = []
    tsOption.value = topPagesOption.value = refOption.value = srcOption.value = devOption.value = brOption.value = osOption.value = null
  } finally {
    loading.value = false
  }
}

function renderAll() {
  // Timeseries — gradient area
  if (timeseries.value.length) {
    const labels = timeseries.value.map(i => new Date(i.ts).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }))
    const pv = timeseries.value.map(i => Number(i.pageviews || 0))
    const ss = timeseries.value.map(i => Number(i.sessions || 0))
    tsOption.value = {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { color: '#334155', fontSize: 12 } },
      legend: { data: ['Pageviews', 'Sessions'], bottom: 0, textStyle: { color: '#64748b' }, icon: 'roundRect' },
      grid: { top: 10, right: 16, bottom: 40, left: 50 },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }, axisLabel: { color: '#94a3b8', fontSize: 11 } },
      series: [
        {
          name: 'Pageviews', type: 'line', data: pv, smooth: true, symbol: 'circle', symbolSize: 5,
          lineStyle: { width: 2.5, color: '#22c55e' },
          itemStyle: { color: '#22c55e' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(34,197,94,0.3)' }, { offset: 1, color: 'rgba(34,197,94,0.02)' }] } },
        },
        {
          name: 'Sessions', type: 'line', data: ss, smooth: true, symbol: 'circle', symbolSize: 5,
          lineStyle: { width: 2.5, color: '#3b82f6' },
          itemStyle: { color: '#3b82f6' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.25)' }, { offset: 1, color: 'rgba(59,130,246,0.02)' }] } },
        },
      ],
    }
  }

  // Top pages — horizontal bar
  if (topPages.value.length) {
    topPagesOption.value = makeBarOption(
      topPages.value.map(i => ({ name: i.pathname, hits: i.hits })),
      '#60a5fa'
    )
  }

  // Horizontal bars for dimensions
  if (referrers.value.length) refOption.value = makeBarOption(referrers.value, GRADIENT_COLORS[0])
  if (sources.value.length) srcOption.value = makeBarOption(sources.value, GRADIENT_COLORS[6])
  if (devices.value.length) devOption.value = makeBarOption(devices.value, GRADIENT_COLORS[2])
  if (browsers.value.length) brOption.value = makeBarOption(browsers.value, GRADIENT_COLORS[3])
  if (oses.value.length) osOption.value = makeBarOption(oses.value, GRADIENT_COLORS[1])
}

onMounted(load)
</script>

<style scoped>
.page-container {
  padding: 88px 24px 120px;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdfa 100%);
  min-height: 100vh;
}
.header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .75rem; }
.title { color: #0f172a; font-weight: 700; font-size: 1.6rem; margin: 0; }
.filters { display: inline-flex; gap: .5rem; }
.range-btn { border: 1px solid rgba(15,23,42,0.12); background: rgba(255,255,255,0.5); backdrop-filter: blur(8px); color: #0f172a; padding: .4rem .7rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.range-btn.active { background: #0ea5e9; color: white; border-color: #0ea5e9; }
.desc { color: #475569; margin: 0; }
.skeleton { display: grid; gap: 1rem; }
.skeleton-row { height: 64px; border-radius: 12px; background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
.skeleton-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
.skeleton-card { height: 110px; border-radius: 12px; background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0 2rem; }
.kpi {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5);
  border-radius: 16px;
  padding: 1rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.kpi:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
.kpi-label { color: #64748b; font-size: .85rem; }
.kpi-value { color: #0f172a; font-weight: 700; font-size: 1.4rem; }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
.chart-card {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5);
  border-radius: 16px;
  padding: 1rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.chart-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.08); }
.chart-title { margin: 0 0 .5rem; font-weight: 600; color: #0f172a; }
.top-list { list-style: none; padding: 0; margin: 1rem 0 0; }
.top-item { display: flex; justify-content: space-between; padding: .5rem 0; border-bottom: 1px solid rgba(15,23,42,0.06); }
.top-item:last-child { border-bottom: none; }
.path { color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
.hits { color: #334155; font-weight: 600; }
.empty { color: #64748b; font-size: .9rem; margin-top: .5rem; }
@media (max-width: 900px) {
  .charts { grid-template-columns: 1fr; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ── Fade transition ──────────────────────────────── */
.fade-enter-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.fade-enter-from { opacity: 0; transform: translateY(12px); }
</style>
