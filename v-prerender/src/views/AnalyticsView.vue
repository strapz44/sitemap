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

    <div v-else>
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">Pageviews</div>
          <div class="kpi-value">{{ summary.pageviews }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Sessions</div>
          <div class="kpi-value">{{ summary.sessions }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Visiteurs</div>
          <div class="kpi-value">{{ summary.visitors }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Bounce rate</div>
          <div class="kpi-value">{{ (summary.bounce_rate * 100).toFixed(1) }}%</div>
        </div>
      </div>

      <div class="charts">
        <div class="chart-card">
          <h2 class="chart-title">Trafic ({{ rangeLabel }})</h2>
          <canvas ref="tsCanvas"></canvas>
          <div v-if="!timeseries.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Top pages ({{ rangeLabel }})</h2>
          <canvas ref="topPagesCanvas"></canvas>
          <ul class="top-list">
            <li v-for="it in topPages" :key="it.pathname" class="top-item">
              <span class="path">{{ it.pathname }}</span>
              <span class="hits">{{ it.hits }}</span>
            </li>
          </ul>
          <div v-if="!topPages.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Référents (domaines)</h2>
          <canvas ref="refCanvas"></canvas>
          <div v-if="!referrers.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Sources (utm_source)</h2>
          <canvas ref="srcCanvas"></canvas>
          <div v-if="!sources.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Appareils</h2>
          <canvas ref="devCanvas"></canvas>
          <div v-if="!devices.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Navigateurs</h2>
          <canvas ref="brCanvas"></canvas>
          <div v-if="!browsers.length" class="empty">Aucune donnée</div>
        </div>

        <div class="chart-card">
          <h2 class="chart-title">Systèmes</h2>
          <canvas ref="osCanvas"></canvas>
          <div v-if="!oses.length" class="empty">Aucune donnée</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const loading = ref(true)
const summary = ref({ pageviews: 0, sessions: 0, visitors: 0, bounces: 0, bounce_rate: 0 })

const range = ref('7d')
const rangeLabel = computed(() => range.value === '7d' ? '7 jours' : range.value === '30d' ? '30 jours' : '90 jours')

const tsCanvas = ref(null)
const topPagesCanvas = ref(null)
const refCanvas = ref(null)
const srcCanvas = ref(null)
const devCanvas = ref(null)
const brCanvas = ref(null)
const osCanvas = ref(null)

let ChartLib = null
let tsChart = null
let topPagesChart = null
let refChart = null
let srcChart = null
let devChart = null
let brChart = null
let osChart = null

const timeseries = ref([])
const topPages = ref([])
const referrers = ref([])
const sources = ref([])
const devices = ref([])
const browsers = ref([])
const oses = ref([])

function setRange(v) {
  if (range.value !== v) {
    range.value = v
    load()
  }
}

async function ensureChart() {
  if (!ChartLib) {
    const m = await import('chart.js/auto')
    ChartLib = m.default || m
  }
  return ChartLib
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

    await renderAll()
  } catch (e) {
    summary.value = { pageviews: 0, sessions: 0, visitors: 0, bounces: 0, bounce_rate: 0 }
    topPages.value = []
    timeseries.value = []
    referrers.value = []
    sources.value = []
    devices.value = []
    browsers.value = []
    oses.value = []
    destroyAll()
  } finally {
    loading.value = false
  }
}

function destroyAll() {
  for (const c of [tsChart, topPagesChart, refChart, srcChart, devChart, brChart]) {
    if (c && typeof c.destroy === 'function') c.destroy()
  }
  tsChart = topPagesChart = refChart = srcChart = devChart = brChart = osChart = null
}

async function renderAll() {
  const Chart = await ensureChart()

  if (tsCanvas.value) {
    if (tsChart && typeof tsChart.destroy === 'function') tsChart.destroy()
    const labels = timeseries.value.map(i => new Date(i.ts)).map(d => d.toLocaleDateString())
    const pv = timeseries.value.map(i => Number(i.pageviews || 0))
    const ss = timeseries.value.map(i => Number(i.sessions || 0))
    tsChart = new Chart(tsCanvas.value.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Pageviews', data: pv, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.2)', tension: .3 },
        { label: 'Sessions', data: ss, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.2)', tension: .3 },
      ]},
      options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
    })
  }

  if (topPagesCanvas.value) {
    if (topPagesChart && typeof topPagesChart.destroy === 'function') topPagesChart.destroy()
    const labels = topPages.value.map(i => i.pathname)
    const data = topPages.value.map(i => Number(i.hits || 0))
    topPagesChart = new Chart(topPagesCanvas.value.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Hits', data, backgroundColor: '#60a5fa' }] },
      options: { responsive: true, scales: { x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } }, y: { beginAtZero: true } } }
    })
  }

  function renderBar(el, items, chartRef) {
    if (!el) return null
    if (chartRef.value && typeof chartRef.value.destroy === 'function') chartRef.value.destroy()
    const labels = items.map(i => i.name)
    const data = items.map(i => Number(i.hits || 0))
    const inst = new Chart(el.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Hits', data, backgroundColor: '#a78bfa' }] },
      options: { responsive: true, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    })
    chartRef.value = inst
    return inst
  }

  refChart = renderBar(refCanvas.value, referrers.value, { get value() { return refChart }, set value(v){ refChart = v } })
  srcChart = renderBar(srcCanvas.value, sources.value, { get value() { return srcChart }, set value(v){ srcChart = v } })
  devChart = renderBar(devCanvas.value, devices.value, { get value() { return devChart }, set value(v){ devChart = v } })
  brChart  = renderBar(brCanvas.value,  browsers.value, { get value() { return brChart },  set value(v){ brChart = v } })
  osChart  = renderBar(osCanvas.value,  oses.value, { get value() { return osChart },  set value(v){ osChart = v } })
}

onMounted(load)
</script>

<style scoped>
.page-container {
  padding: 6rem 2rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .75rem; }
.title { color: #0f172a; font-weight: 700; font-size: 1.6rem; margin: 0; }
.filters { display: inline-flex; gap: .5rem; }
.range-btn { border: 1px solid rgba(15,23,42,0.12); background: #fff; color: #0f172a; padding: .4rem .7rem; border-radius: 8px; cursor: pointer; }
.range-btn.active { background: #0ea5e9; color: white; border-color: #0ea5e9; }
.desc { color: #475569; margin: 0; }
.skeleton { display: grid; gap: 1rem; }
.skeleton-row { height: 64px; border-radius: 12px; background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
.skeleton-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
.skeleton-card { height: 110px; border-radius: 12px; background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0 2rem; }
.kpi { background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); border-radius: 12px; padding: 1rem; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.kpi-label { color: #64748b; font-size: .85rem; }
.kpi-value { color: #0f172a; font-weight: 700; font-size: 1.4rem; }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
.chart-card { background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); border-radius: 12px; padding: 1rem; }
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
</style>
